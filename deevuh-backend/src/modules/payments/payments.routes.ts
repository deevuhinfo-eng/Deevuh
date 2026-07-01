import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { calculateGST, generatePayUHash, processPayUWebhook } from './payments.service.js';
import { checkCODEligibility } from './cod-eligibility.service.js';
import { getCODSettings } from '../admin/settings.service.js';

const router = Router();

const PAYU_ENABLED =
  process.env.PAYU_MERCHANT_KEY && process.env.PAYU_MERCHANT_KEY !== 'DISABLED';

const checkoutSchema = z.object({
  shippingName: z.string().min(2, 'Name must be at least 2 characters').max(255),
  shippingPhone: z.string().min(10, 'Invalid phone number').max(20),
  shippingAddress: z.string().min(10, 'Address must be at least 10 characters').max(1000),
  couponCode: z.string().max(50).optional(),
  paymentMethod: z.enum(['ONLINE', 'COD']).default('ONLINE'),
});

router.get(
  '/cod-eligibility',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Authentication required.' });
        return;
      }

      const cart = await prisma.cart.findFirst({
        where: { userId, status: 'active' },
        include: { items: { include: { variant: true } } },
      });

      if (!cart || cart.items.length === 0) {
        res.status(200).json({
          status: 'success',
          data: { eligible: false, reason: 'Cart is empty.', bookingAmount: 0, remainingAmount: 0 }
        });
        return;
      }

      const cartTotal = cart.items.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0);
      const result = await checkCODEligibility(userId, cartTotal, prisma);
      res.status(200).json({ status: 'success', data: result });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
);

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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Authentication required.' });
        return;
      }

      if (!PAYU_ENABLED) {
        res.status(400).json({
          status: 'error',
          message: 'Online payments are currently unavailable. Cash on Delivery is not supported.',
        });
        return;
      }

      const { shippingName, shippingPhone, shippingAddress, couponCode, paymentMethod } = req.body;

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
        res.status(400).json({ status: 'error', message: 'Cart is empty.' });
        return;
      }

      // Calculate subtotal
      let totalAmount = 0;
      for (const item of cart.items) {
        totalAmount += Number(item.variant.price) * item.quantity;
      }

      // Verify COD eligibility if user requested COD
      if (paymentMethod === 'COD') {
        const eligibility = await checkCODEligibility(userId, totalAmount, prisma);
        if (!eligibility.eligible) {
          res.status(400).json({ status: 'error', message: eligibility.reason || 'Cash on Delivery is not available.' });
          return;
        }
      }

      const txnid = `DEEVUH_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

      // SINGLE ATOMIC TRANSACTION:
      // 1. Validate coupon if provided
      // 2. Create order (stock reservation deferred to payment webhook)
      // 3. Increment coupon usage
      // 4. Convert cart
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

        // Fetch settings if payment method is COD
        let bookingAmount = null;
        let remainingCODAmount = null;
        let isCOD = false;

        if (paymentMethod === 'COD') {
          isCOD = true;
          const codSettings = await getCODSettings();
          bookingAmount = codSettings.bookingAmount;
          if (codSettings.freeAbove > 0 && finalAmount > codSettings.freeAbove) {
            bookingAmount = 0;
          }
          remainingCODAmount = Math.round((finalAmount - bookingAmount) * 100) / 100;
        }

        // Create order
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
            paymentMethod: paymentMethod === 'COD' ? 'COD' : 'ONLINE',
            paymentStatus: 'PENDING',
            orderStatus: 'CREATED',
            isCOD,
            codEligible: true,
            bookingAmount,
            remainingCODAmount,
            stockReserved: false,
            items: {
              create: cart.items.map((item) => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                unitPrice: item.variant.price,
              })),
            },
          },
        });

        // Increment coupon usage
        if (couponId) {
          await tx.coupon.update({
            where: { id: couponId },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Convert cart
        await tx.cart.update({
          where: { id: cart.id },
          data: { status: 'converted' },
        });

        return { order: createdOrder, finalAmount, gstAmount, discountAmount };
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const chargeAmount = order.isCOD ? Number(order.bookingAmount || 0) : finalAmount;

      // Handle Free COD booking fee edge case
      if (order.isCOD && chargeAmount === 0) {
        await prisma.$transaction(async (tx) => {
          // Reserve stock atomically
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

          // Update order status directly
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'BOOKING_RECEIVED',
              orderStatus: 'CONFIRMED',
              stockReserved: true,
            },
          });
        });

        // Trigger emails asynchronously
        const updatedOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            user: true,
            items: {
              include: {
                variant: { include: { product: true } },
              },
            },
          },
        });

        if (updatedOrder?.user?.email) {
          const emailData = {
            orderId: updatedOrder.id,
            customerName: updatedOrder.shippingName,
            customerEmail: updatedOrder.user.email,
            customerPhone: updatedOrder.shippingPhone,
            shippingAddress: updatedOrder.shippingAddress,
            totalAmount: Number(updatedOrder.totalAmount),
            discountAmount: Number(updatedOrder.discountAmount),
            gstAmount: Number(updatedOrder.gstAmount),
            finalAmount: Number(updatedOrder.finalAmount),
            paymentGatewayTxnId: updatedOrder.paymentGatewayTxnId || txnid,
            paymentMethod: 'COD',
            isCOD: true,
            bookingAmount: 0,
            remainingCODAmount: Number(updatedOrder.remainingCODAmount || 0),
            items: updatedOrder.items.map((item: any) => ({
              productTitle: item.variant?.product?.title || 'Tailored Garment',
              size: item.variant?.size || 'Custom',
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            })),
          };

          const { sendOrderEmails } = await import('../auth/email.service.js');
          sendOrderEmails(emailData).catch((err: any) => {
            console.error(`[Order Email Error] Error triggering emails for free COD:`, err.message);
          });
        }

        res.status(201).json({
          status: 'success',
          data: {
            orderId: order.id,
            paymentMethod: 'COD',
            summary: {
              totalAmount,
              discountAmount,
              gstAmount,
              finalAmount,
              isCOD: true,
              bookingAmount: 0,
              remainingCODAmount: finalAmount,
            },
          },
        });
        return;
      }

      const payuHash = generatePayUHash(
        txnid,
        chargeAmount.toFixed(2),
        `Order ${order.id}`,
        shippingName,
        user?.email || ''
      );

      res.status(201).json({
        status: 'success',
        data: {
          orderId: order.id,
          paymentMethod: order.isCOD ? 'COD' : 'PAYU',
          paymentParams: {
            key: process.env.PAYU_MERCHANT_KEY,
            txnid,
            amount: chargeAmount.toFixed(2),
            productinfo: `Order ${order.id}`,
            firstname: shippingName,
            email: user?.email,
            phone: shippingPhone,
            hash: payuHash,
            surl: `${process.env.BACKEND_URL}/api/checkout/success`,
            furl: `${process.env.BACKEND_URL}/api/checkout/failure`,
          },
          summary: {
            totalAmount,
            discountAmount,
            gstAmount,
            finalAmount,
            isCOD: order.isCOD,
            bookingAmount: order.bookingAmount ? Number(order.bookingAmount) : null,
            remainingCODAmount: order.remainingCODAmount ? Number(order.remainingCODAmount) : null,
          },
        },
      });
    } catch (error: any) {
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
  try {
    await processPayUWebhook(req.body);
    res.redirect(`${frontendUrl}/dashboard?payment=success`);
  } catch (error: any) {
    console.error('[PayU Success Redirect Error]', error.message);
    res.redirect(`${frontendUrl}/checkout?payment=error&reason=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/checkout/failure
 * Browser redirect from PayU on failed/cancelled payment.
 */
router.post('/failure', async (req: Request, res: Response): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://deevuh.in';
  try {
    await processPayUWebhook(req.body);
    res.redirect(`${frontendUrl}/checkout?payment=failure`);
  } catch (error: any) {
    console.error('[PayU Failure Redirect Error]', error.message);
    res.redirect(`${frontendUrl}/checkout?payment=failure`);
  }
});

/**
 * POST /api/checkout/webhooks/payu
 * UNAUTHENTICATED — Signature-verified PayU webhook.
 * Only active when PayU is enabled.
 */
router.post('/webhooks/payu', async (req: Request, res: Response): Promise<void> => {
  if (!PAYU_ENABLED) {
    res.status(200).json({ status: 'ok', message: 'PayU not active.' });
    return;
  }

  try {
    const result = await processPayUWebhook(req.body);
    res.status(200).json({ status: result ? 'success' : 'failed' });
  } catch (error: any) {
    console.error('[PayU Webhook Error]', error.message);
    res.status(400).json({ status: 'error', message: error.message });
  }
});

export default router;
