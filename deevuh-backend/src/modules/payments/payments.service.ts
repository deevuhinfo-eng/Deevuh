import crypto from 'crypto';
import prisma from '../../config/database.js';
import { sendOrderConfirmationEmail } from '../auth/email.service.js';

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
  const { txnid, amount, status, hash, productinfo, firstname, email } = payload;
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

  const webhookId = String(payload.mihpayid || `${txnid}_${status}`);

  // Outer fast check
  const alreadyProcessed = await prisma.processedWebhook.findUnique({
    where: { webhookId },
  });
  if (alreadyProcessed) {
    console.log(`[PayU Webhook] Duplicate webhook for txnid ${txnid} (webhookId: ${webhookId}) — already processed.`);
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
      return true;
    }

    // Skip if order was already marked failed
    if (order.paymentStatus === 'FAILED') {
      await tx.processedWebhook.create({
        data: { webhookId, paymentId: txnid, status: 'failure' },
      });
      return false;
    }

    if (status === 'success') {
      await tx.order.update({
        where: { paymentGatewayTxnId: txnid },
        data: { paymentStatus: 'SUCCESS', orderStatus: 'PROCESSING' },
      });

      await tx.processedWebhook.create({
        data: { webhookId, paymentId: txnid, status: 'success' },
      });

      return true;
    }

    if (status === 'failure' || status === 'failed') {
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

      return false;
    }

    return false;
  });

  // Send confirmation email asynchronously on success
  if (isSuccess && status === 'success') {
    const updatedOrder = await prisma.order.findUnique({
      where: { paymentGatewayTxnId: txnid },
      include: { user: true },
    });

    if (updatedOrder?.user?.email) {
      sendOrderConfirmationEmail(updatedOrder.user.email, {
        orderId: updatedOrder.id,
        customerName: updatedOrder.shippingName,
        finalAmount: Number(updatedOrder.finalAmount),
        shippingAddress: updatedOrder.shippingAddress,
      }).catch((err: any) => {
        console.error('[Order Confirmation Email Error]', err.message);
      });
    }
  }

  return isSuccess;
};
