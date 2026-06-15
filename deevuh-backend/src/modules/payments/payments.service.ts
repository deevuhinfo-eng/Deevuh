import crypto from 'crypto';
import prisma from '../../config/database.js';

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

  // Verify response signature using reverse sequence
  const reverseSequence = `${salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  const computedHash = crypto
    .createHash('sha512')
    .update(reverseSequence)
    .digest('hex');

  if (computedHash !== hash) {
    throw new Error('Tampered payment signature detected. Webhook payload rejected.');
  }

  // Idempotency check — skip if already processed
  const existingOrder = await prisma.order.findUnique({
    where: { paymentGatewayTxnId: txnid },
  });

  if (!existingOrder) {
    throw new Error(`Order with transaction ID ${txnid} not found.`);
  }

  if (existingOrder.paymentStatus === 'SUCCESS') {
    console.log(`[PayU] Duplicate webhook for txnid ${txnid} — already processed.`);
    return true;
  }

  if (existingOrder.paymentStatus === 'FAILED') {
    console.log(`[PayU] Transaction ${txnid} already processed as FAILED.`);
    return false;
  }

  if (status === 'success') {
    await prisma.order.update({
      where: { paymentGatewayTxnId: txnid },
      data: { paymentStatus: 'SUCCESS', orderStatus: 'PROCESSING' },
    });
    return true;
  }

  // Handle failed payments
  if (status === 'failure') {
    // Concurrency Protection: Wrap stock restore inside database transaction
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { paymentGatewayTxnId: txnid },
        data: { paymentStatus: 'FAILED', orderStatus: 'CANCELLED' },
        include: { items: true },
      });

      // Restore stock since order failed
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stockQty: { increment: item.quantity } },
        });
      }
    });
  }

  return false;
};
