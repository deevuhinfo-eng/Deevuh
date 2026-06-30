import crypto from 'crypto';
import prisma from '../../config/database.js';
import { sendOrderEmails, type OrderEmailData } from '../auth/email.service.js';

const GST_RATE = 0.18; // 18% Indian GST

/**
 * Calculate GST amount with rounding to 2 decimal places.
 */
export const calculateGST = (amount: number): number => {
  return Math.round((amount - amount / (1 + GST_RATE)) * 100) / 100;
};

/**
 * Generate PayU SHA-512 hash for initiating payment.
 * Strict PayU Sequence: key|txnid|amount|productinfo|firstname|email|||||||||||salt
 */
export const generatePayUHash = (
  txnid: string,
  amount: string,
  productinfo: string,
  firstname: string,
  email: string
): string => {
  const key = process.env.PAYU_MERCHANT_KEY || '';
  const salt = process.env.PAYU_MERCHANT_SALT || '';

  const sequence = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
  return crypto.createHash('sha512').update(sequence).digest('hex');
};

/**
 * Verify PayU webhook signature and process successful payments.
 * Uses reverse hash verification and wraps stock deductions in prisma.$transaction.
 */
export const processPayUWebhook = async (payload: any): Promise<boolean> => {
  const txnid = payload.txnid || '';
  const amount = payload.amount || '';
  const status = payload.status || '';
  const hash = payload.hash || '';
  const productinfo = payload.productinfo || '';
  const firstname = payload.firstname || '';
  const email = payload.email || '';

  const key = process.env.PAYU_MERCHANT_KEY || '';
  const salt = process.env.PAYU_MERCHANT_SALT || '';

  const udf5 = payload.udf5 || '';
  const udf4 = payload.udf4 || '';
  const udf3 = payload.udf3 || '';
  const udf2 = payload.udf2 || '';
  const udf1 = payload.udf1 || '';

  // PayU standard reverse hash format (without additional charges prepended):
  // salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const baseSequence = `${status}||||||${udf5}|${udf4}|${udf3}|${udf2}|${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;

  let computedHash = '';
  if (payload.additional_charges) {
    const seqWithCharges = `${payload.additional_charges}|${salt}|${baseSequence}`;
    computedHash = crypto.createHash('sha512').update(seqWithCharges).digest('hex');
  }

  if (computedHash !== hash) {
    const seqWithoutCharges = `${salt}|${baseSequence}`;
    computedHash = crypto.createHash('sha512').update(seqWithoutCharges).digest('hex');
  }

  if (computedHash !== hash) {
    throw new Error('Tampered payment signature detected. Webhook payload rejected.');
  }

  const statusLower = status.toLowerCase();
  const webhookId = String(payload.mihpayid || `${txnid}_${status}`);

  console.log(`[PayU Webhook] [${new Date().toISOString()}] Received webhook payload: txnid=${txnid}, status=${status}, amount=${amount}, hash=${hash}, mihpayid=${payload.mihpayid}`);

  // Outer fast check
  const alreadyProcessed = await prisma.processedWebhook.findUnique({
    where: { webhookId },
  });
  if (alreadyProcessed) {
    console.log(`[PayU Webhook] [${new Date().toISOString()}] Duplicate webhook for txnid ${txnid} (webhookId: ${webhookId}) — already processed.`);
    return alreadyProcessed.status === 'success';
  }

  // Atomically process webhook and order status
  const isSuccess = await prisma.$transaction(async (tx) => {
    // Re-check inside transaction to prevent concurrent race conditions
    const exists = await tx.processedWebhook.findUnique({
      where: { webhookId },
    });
    if (exists) {
      return exists.status === 'success';
    }

    const order = await tx.order.findUnique({
      where: { paymentGatewayTxnId: txnid },
      include: { items: true },
    });

    if (!order) {
      throw new Error(`Order with transaction ID ${txnid} not found.`);
    }

    // Verify amount matches
    const orderAmount = Number(order.finalAmount);
    const paidAmount = Number(amount);
    if (Math.abs(orderAmount - paidAmount) > 0.01) {
      throw new Error(`Payment amount mismatch. Order finalAmount: ${orderAmount}, Paid amount: ${paidAmount}`);
    }

    // Skip if order was already successfully paid
    if (order.paymentStatus === 'SUCCESS') {
      await tx.processedWebhook.create({
        data: { webhookId, paymentId: txnid, status: 'success' },
      });
      console.log(`[PayU Webhook] [${new Date().toISOString()}] Order ${order.id} is already in SUCCESS state.`);
      return true;
    }

    if (statusLower === 'success') {
      // Recovery logic: if order was previously CANCELLED or FAILED, re-deduct the stock since they were returned to inventory
      if (order.orderStatus === 'CANCELLED' || order.paymentStatus === 'FAILED') {
        console.log(`[PayU Webhook] [${new Date().toISOString()}] Recovering order ${order.id} from CANCELLED/FAILED state. Re-decrementing stock...`);
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: { stockQty: { decrement: item.quantity } },
          });
        }
      }

      await tx.order.update({
        where: { paymentGatewayTxnId: txnid },
        data: { paymentStatus: 'SUCCESS', orderStatus: 'PROCESSING' },
      });

      await tx.processedWebhook.create({
        data: { webhookId, paymentId: txnid, status: 'success' },
      });

      console.log(`[PayU Webhook] [${new Date().toISOString()}] Order ${order.id} updated to SUCCESS / PROCESSING.`);
      return true;
    }

    if (statusLower === 'failure' || statusLower === 'failed') {
      // Skip if order was already marked failed/cancelled
      if (order.paymentStatus === 'FAILED' && order.orderStatus === 'CANCELLED') {
        await tx.processedWebhook.create({
          data: { webhookId, paymentId: txnid, status: 'failure' },
        });
        return false;
      }

      await tx.order.update({
        where: { paymentGatewayTxnId: txnid },
        data: { paymentStatus: 'FAILED', orderStatus: 'CANCELLED' },
      });

      // Restore stock since order failed
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stockQty: { increment: item.quantity } },
        });
      }

      await tx.processedWebhook.create({
        data: { webhookId, paymentId: txnid, status: 'failure' },
      });

      console.log(`[PayU Webhook] [${new Date().toISOString()}] Order ${order.id} payment failed. Marked FAILED/CANCELLED and stock restored.`);
      return false;
    }

    return false;
  });

  // Send both emails (customer + owner) asynchronously on success
  if (isSuccess && statusLower === 'success') {
    const updatedOrder = await prisma.order.findUnique({
      where: { paymentGatewayTxnId: txnid },
      include: {
        user: true,
        items: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (updatedOrder?.user?.email) {
      const emailData: OrderEmailData = {
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
        paymentMethod: 'PayU',
        items: updatedOrder.items.map((item: any) => ({
          productTitle: item.variant?.product?.title || 'Tailored Garment',
          size: item.variant?.size || 'Custom',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
      };

      console.log(`[PayU Webhook] [${new Date().toISOString()}] Triggering async order emails for order ${updatedOrder.id}...`);
      sendOrderEmails(emailData).catch((err: any) => {
        console.error(`[Order Email Error] [${new Date().toISOString()}] Error triggering emails:`, err.message);
      });
    }
  }

  return isSuccess;
};
