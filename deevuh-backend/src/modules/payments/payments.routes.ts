import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { calculateGST, generatePayUHash, processPayUWebhook } from './payments.service.js';
import { logger } from '../../utils/logger.js';
import { CorrelatedRequest } from '../../middleware/correlation.js';

const router = Router();

/**
 * Whether PayU credentials are active.
 * When PAYU_MERCHANT_KEY === 'DISABLED', orders are placed as
 * PENDING_COD (Cash-on-Delivery) and confirmed manually by the admin.
 */
const PAYU_ENABLED =
  process.env.PAYU_MERCHANT_KEY && process.env.PAYU_MERCHANT_KEY !== 'DISABLED';

const checkoutSchema = z.object({
  shippingName: z.string().min(2, 'Name must be at least 2 characters').max(255),
  shippingPhone: z.string().min(10, 'Invalid phone number').max(20),
  shippingAddress: z.string().min(10, 'Address must be at least 10 characters').max(1000),
  couponCode: z.string().max(50).optional(),
});

/**
 * POST /api/checkout/create-order
 * Authenticated — Creates an order atomically.
 *
 * When PayU is DISABLED:
 *   • paymentMethod returns 'COD'
 *   • Order is created with paymentStatus 'PENDING'
 *   • No PayU redirect params are returned
 *   • Frontend shows "Order placed — we'll confirm via WhatsApp/email"
 *
 * When PayU is ENABLED (production):
 *   • Returns full paymentParams for redirect to PayU
 */
router.post(
  '/create-order',
  authMiddleware,
  validateRequest(checkoutSchema),
  async (req: AuthenticatedRequest & CorrelatedRequest, res: Response): Promise<void> => {
    const userId = req.user?.id;
    try {
      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Authentication required.' });
        return;
      }

      logger.info('Checkout process started', {
        requestId: req.requestId,
        userId,
        endpoint: 'POST /api/checkout/create-order',
        functionName: 'create-order route',
      });

      if (!PAYU_ENABLED) {
        logger.warn('Checkout failed: Online payments disabled', {
          requestId: req.requestId,
          userId,
          endpoint: 'POST /api/checkout/create-order',
          functionName: 'create-order route',
          result: 'FAILURE',
        });
        res.status(400).json({
          status: 'error',
          message: 'Online payments are currently unavailable. Cash on Delivery is not supported.',
        });
        return;
      }

      const { shippingName, shippingPhone, shippingAddress, couponCode } = req.body;

      // Get active cart with full variant and product data
      const cart = await prisma.cart.findFirst({
        where: { userId, status: 'active' },
        include: {
          items: {
            include: {
              variant: { include: { product: true } },
            },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        logger.warn('Checkout failed: Cart is empty', {
          requestId: req.requestId,
          userId,
          endpoint: 'POST /api/checkout/create-order',
          functionName: 'create-order route',
          result: 'FAILURE',
        });
        res.status(400).json({ status: 'error', message: 'Cart is empty.' });
        return;
      }

      // Calculate subtotal
      let totalAmount = 0;
      for (const item of cart.items) {
        totalAmount += Number(item.variant.price) * item.quantity;
      }

      const txnid = `DEEVUH_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

      logger.info('Checkout database transaction started', {
        requestId: req.requestId,
        userId,
        paymentId: txnid,
        endpoint: 'POST /api/checkout/create-order',
        functionName: 'create-order route',
      });

      // SINGLE ATOMIC TRANSACTION:
      // 1. Validate coupon if provided
      // 2. Reserve stock
      // 3. Create order
      // 4. Increment coupon usage
      // 5. Convert cart
      const { order, finalAmount, gstAmount, discountAmount } = await prisma.$transaction(async (tx) => {
        let discountAmount = 0;
        let couponId: string | null = null;

        if (couponCode) {
          const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
          if (!coupon || !coupon.isActive || new Date() > coupon.expiresAt) {
            throw new Error('Coupon is invalid or expired.');
          }
          if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            throw new Error('Coupon usage limit reached.');
          }
          if (coupon.minPurchase && totalAmount < Number(coupon.minPurchase)) {
            throw new Error(`Minimum purchase of ₹${coupon.minPurchase} required for this coupon.`);
          }

          discountAmount =
            coupon.discountType === 'percentage'
              ? Math.round((totalAmount * Number(coupon.discountValue)) / 100 * 100) / 100
              : Number(coupon.discountValue);
          couponId = coupon.id;
        }

        const finalAmount = Math.round((totalAmount - discountAmount) * 100) / 100;
        const gstAmount = calculateGST(finalAmount);

        // Step 1: Reserve stock atomically
        for (const item of cart.items) {
          const updated = await tx.productVariant.updateMany({
            where: {
              id: item.productVariantId,
              stockQty: { gte: item.quantity },
            },
            data: { stockQty: { decrement: item.quantity } },
          });

          if (updated.count === 0) {
            throw new Error(
              `Insufficient stock for ${item.variant.product.title} (${item.variant.size}).`
            );
          }
        }

        logger.info('Inventory reserved for checkout', {
          requestId: req.requestId,
          userId,
          paymentId: txnid,
          endpoint: 'POST /api/checkout/create-order',
          functionName: 'create-order transaction',
          items: cart.items.map(item => ({
            variantId: item.productVariantId,
            quantity: item.quantity,
          })),
        });

        // Step 2: Create order
        const createdOrder = await tx.order.create({
          data: {
            userId,
            shippingName,
            shippingPhone,
            shippingAddress,
            couponId,
            totalAmount,
            discountAmount,
            gstAmount,
            finalAmount,
            paymentGatewayTxnId: txnid,
            paymentStatus: 'PENDING',
            orderStatus: 'CREATED',
            items: {
              create: cart.items.map((item) => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                unitPrice: item.variant.price,
              })),
            },
          },
        });

        logger.info('Order created in database', {
          requestId: req.requestId,
          userId,
          orderId: createdOrder.id,
          paymentId: txnid,
          endpoint: 'POST /api/checkout/create-order',
          functionName: 'create-order transaction',
        });

        // Step 3: Increment coupon usage
        if (couponId) {
          await tx.coupon.update({
            where: { id: couponId },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Step 4: Convert cart
        await tx.cart.update({
          where: { id: cart.id },
          data: { status: 'converted' },
        });

        return { order: createdOrder, finalAmount, gstAmount, discountAmount };
      });

      logger.info('Checkout transaction committed successfully', {
        requestId: req.requestId,
        userId,
        orderId: order.id,
        paymentId: txnid,
        endpoint: 'POST /api/checkout/create-order',
        functionName: 'create-order route',
        result: 'SUCCESS',
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const payuHash = generatePayUHash(
        txnid,
        finalAmount.toFixed(2),
        `Order ${order.id}`,
        shippingName,
        user?.email || ''
      );

      logger.info('Redirecting customer to PayU payment gateway', {
        requestId: req.requestId,
        userId,
        orderId: order.id,
        paymentId: txnid,
        endpoint: 'POST /api/checkout/create-order',
        functionName: 'create-order route',
        result: 'SUCCESS',
      });

      res.status(201).json({
        status: 'success',
        data: {
          orderId: order.id,
          paymentMethod: 'PAYU',
          paymentParams: {
            key: process.env.PAYU_MERCHANT_KEY,
            txnid,
            amount: finalAmount.toFixed(2),
            productinfo: `Order ${order.id}`,
            firstname: shippingName,
            email: user?.email,
            phone: shippingPhone,
            hash: payuHash,
            surl: `${process.env.BACKEND_URL}/api/checkout/success`,
            furl: `${process.env.BACKEND_URL}/api/checkout/failure`,
          },
          summary: { totalAmount, discountAmount, gstAmount, finalAmount },
        },
      });

      logger.info('Checkout initialization completed', {
        requestId: req.requestId,
        userId,
        orderId: order.id,
        paymentId: txnid,
        endpoint: 'POST /api/checkout/create-order',
        functionName: 'create-order route',
        result: 'SUCCESS',
      });
    } catch (error: any) {
      logger.error('Checkout process failed', error, {
        requestId: req.requestId,
        userId,
        endpoint: 'POST /api/checkout/create-order',
        functionName: 'create-order route',
        result: 'FAILURE',
      });
      const badRequestMessages = [
        'Coupon is invalid or expired',
        'Coupon usage limit reached',
        'Minimum purchase of',
        'Insufficient stock for'
      ];
      const isBadRequest = badRequestMessages.some(msg => error.message.includes(msg));
      res.status(isBadRequest ? 400 : 500).json({ status: 'error', message: error.message });
    }
  }
);

/**
 * POST /api/checkout/success
 * Browser redirect from PayU on successful payment.
 */
router.post('/success', async (req: Request, res: Response): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://deevuh.in';
  const correlatedReq = req as CorrelatedRequest;
  logger.info('PayU success browser callback received', {
    requestId: correlatedReq.requestId,
    paymentId: req.body.txnid,
    endpoint: 'POST /api/checkout/success',
    functionName: '/success route',
  });
  try {
    await processPayUWebhook(req.body, correlatedReq.requestId);
    logger.info('Success browser callback processing completed', {
      requestId: correlatedReq.requestId,
      paymentId: req.body.txnid,
      endpoint: 'POST /api/checkout/success',
      functionName: '/success route',
      result: 'SUCCESS',
    });
    res.redirect(`${frontendUrl}/dashboard?payment=success`);
  } catch (error: any) {
    logger.error('Success browser callback processing failed', error, {
      requestId: correlatedReq.requestId,
      paymentId: req.body.txnid,
      endpoint: 'POST /api/checkout/success',
      functionName: '/success route',
      result: 'FAILURE',
    });
    res.redirect(`${frontendUrl}/checkout?payment=error&reason=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/checkout/failure
 * Browser redirect from PayU on failed/cancelled payment.
 */
router.post('/failure', async (req: Request, res: Response): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://deevuh.in';
  const correlatedReq = req as CorrelatedRequest;
  logger.info('PayU failure browser callback received', {
    requestId: correlatedReq.requestId,
    paymentId: req.body.txnid,
    endpoint: 'POST /api/checkout/failure',
    functionName: '/failure route',
  });
  try {
    await processPayUWebhook(req.body, correlatedReq.requestId);
    logger.info('Failure browser callback processing completed', {
      requestId: correlatedReq.requestId,
      paymentId: req.body.txnid,
      endpoint: 'POST /api/checkout/failure',
      functionName: '/failure route',
      result: 'SUCCESS',
    });
    res.redirect(`${frontendUrl}/checkout?payment=failure`);
  } catch (error: any) {
    logger.error('Failure browser callback processing failed', error, {
      requestId: correlatedReq.requestId,
      paymentId: req.body.txnid,
      endpoint: 'POST /api/checkout/failure',
      functionName: '/failure route',
      result: 'FAILURE',
    });
    res.redirect(`${frontendUrl}/checkout?payment=failure`);
  }
});

/**
 * POST /api/checkout/webhooks/payu
 * UNAUTHENTICATED — Signature-verified PayU webhook.
 * Only active when PayU is enabled.
 */
router.post('/webhooks/payu', async (req: Request, res: Response): Promise<void> => {
  const correlatedReq = req as CorrelatedRequest;
  logger.info('PayU server webhook received', {
    requestId: correlatedReq.requestId,
    paymentId: req.body.txnid,
    endpoint: 'POST /api/checkout/webhooks/payu',
    functionName: '/webhooks/payu route',
  });
  if (!PAYU_ENABLED) {
    logger.warn('PayU server webhook received but PayU is disabled', {
      requestId: correlatedReq.requestId,
      endpoint: 'POST /api/checkout/webhooks/payu',
      functionName: '/webhooks/payu route',
    });
    res.status(200).json({ status: 'ok', message: 'PayU not active.' });
    return;
  }

  try {
    const result = await processPayUWebhook(req.body, correlatedReq.requestId);
    logger.info('PayU server webhook processing completed', {
      requestId: correlatedReq.requestId,
      paymentId: req.body.txnid,
      endpoint: 'POST /api/checkout/webhooks/payu',
      functionName: '/webhooks/payu route',
      result: result ? 'SUCCESS' : 'FAILURE',
    });
    res.status(200).json({ status: result ? 'success' : 'failed' });
  } catch (error: any) {
    logger.error('PayU server webhook processing failed', error, {
      requestId: correlatedReq.requestId,
      paymentId: req.body.txnid,
      endpoint: 'POST /api/checkout/webhooks/payu',
      functionName: '/webhooks/payu route',
      result: 'FAILURE',
    });
    res.status(400).json({ status: 'error', message: error.message });
  }
});

export default router;
