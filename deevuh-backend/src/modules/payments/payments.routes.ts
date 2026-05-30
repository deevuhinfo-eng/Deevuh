import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import prisma from '../../config/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { calculateGST } from './payments.service.js';
import { sendOrderConfirmationEmail } from '../auth/email.service.js';

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
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'error', message: 'Authentication required.' });
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
        res.status(400).json({ status: 'error', message: 'Cart is empty.' });
        return;
      }

      // Calculate subtotal
      let totalAmount = 0;
      for (const item of cart.items) {
        totalAmount += Number(item.variant.price) * item.quantity;
      }

      // Validate coupon (read-only, before transaction)
      let discountAmount = 0;
      let couponId: string | null = null;
      if (couponCode) {
        const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
        if (!coupon || !coupon.isActive || new Date() > coupon.expiresAt) {
          res.status(400).json({ status: 'error', message: 'Coupon is invalid or expired.' });
          return;
        }
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
          res.status(400).json({ status: 'error', message: 'Coupon usage limit reached.' });
          return;
        }
        if (coupon.minPurchase && totalAmount < Number(coupon.minPurchase)) {
          res.status(400).json({
            status: 'error',
            message: `Minimum purchase of ₹${coupon.minPurchase} required for this coupon.`,
          });
          return;
        }

        discountAmount =
          coupon.discountType === 'percentage'
            ? Math.round((totalAmount * Number(coupon.discountValue)) / 100 * 100) / 100
            : Number(coupon.discountValue);
        couponId = coupon.id;
      }

      const afterDiscount = totalAmount - discountAmount;
      const gstAmount = calculateGST(afterDiscount);
      const finalAmount = Math.round((afterDiscount + gstAmount) * 100) / 100;
      const txnid = `DEEVUH_${uuidv4().replace(/-/g, '').substring(0, 16)}`;

      // SINGLE ATOMIC TRANSACTION:
      // 1. Reserve stock
      // 2. Create order
      // 3. Increment coupon usage
      // 4. Convert cart
      const order = await prisma.$transaction(async (tx) => {
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

        return createdOrder;
      });

      // ── PayU DISABLED MODE ────────────────────────────────────────
      if (!PAYU_ENABLED) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        console.log(`[Checkout] Order ${order.id} created (COD mode). TxnID: ${txnid}`);
        
        // Fire-and-forget order confirmation email
        if (user?.email) {
          sendOrderConfirmationEmail(user.email, {
            orderId: order.id,
            customerName: shippingName,
            finalAmount,
            shippingAddress,
          }).catch(console.error);
        }

        res.status(201).json({
          status: 'success',
          data: {
            orderId: order.id,
            paymentMethod: 'COD',
            message:
              'Your order has been placed! We will confirm it via WhatsApp or email within 24 hours.',
            summary: { totalAmount, discountAmount, gstAmount, finalAmount },
          },
        });
        return;
      }

      // ── PayU ENABLED MODE (production) ───────────────────────────
      const { generatePayUHash } = await import('./payments.service.js');
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const payuHash = generatePayUHash(
        txnid,
        finalAmount.toFixed(2),
        `Order ${order.id}`,
        shippingName,
        user?.email || ''
      );

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
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
);

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
    const { processPayUWebhook } = await import('./payments.service.js');
    const result = await processPayUWebhook(req.body);
    res.status(200).json({ status: result ? 'success' : 'failed' });
  } catch (error: any) {
    console.error('[PayU Webhook Error]', error.message);
    res.status(400).json({ status: 'error', message: error.message });
  }
});

export default router;
