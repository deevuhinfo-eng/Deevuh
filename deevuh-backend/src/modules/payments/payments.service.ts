import crypto from 'crypto';
import prisma from '../../config/database.js';
import { sendOrderEmails, type OrderEmailData } from '../auth/email.service.js';
import { logger } from '../../utils/logger.js';

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
export const processPayUWebhook = async (payload: any, requestId?: string): Promise<boolean> => {
  const { txnid, amount, status, hash, productinfo, firstname, email } = payload;
  try {
    const key = process.env.PAYU_MERCHANT_KEY || '';
    const salt = process.env.PAYU_MERCHANT_SALT || '';

    const udf5 = payload.udf5 || '';
    const udf4 = payload.udf4 || '';
    const udf3 = payload.udf3 || '';
    const udf2 = payload.udf2 || '';
    const udf1 = payload.udf1 || '';

    logger.info('PayU signature verification started', {
      requestId,
      paymentId: txnid,
      functionName: 'processPayUWebhook',
    });

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
      const err = new Error('Tampered payment signature detected. Webhook payload rejected.');
      logger.error('PayU signature verification failed', err, {
        requestId,
        paymentId: txnid,
        functionName: 'processPayUWebhook',
        result: 'FAILURE',
      });
      throw err;
    }

    logger.info('PayU signature verification succeeded', {
      requestId,
      paymentId: txnid,
      functionName: 'processPayUWebhook',
      result: 'SUCCESS',
    });

    const webhookId = String(payload.mihpayid || `${txnid}_${status}`);

    // Outer fast check
    const alreadyProcessed = await prisma.processedWebhook.findUnique({
      where: { webhookId },
    });
    if (alreadyProcessed) {
      logger.info('Duplicate webhook processing bypassed (already processed)', {
        requestId,
        paymentId: txnid,
        functionName: 'processPayUWebhook',
        result: 'SUCCESS',
      });
      return alreadyProcessed.status === 'success';
    }

    logger.info('Webhook database transaction started', {
      requestId,
      paymentId: txnid,
      functionName: 'processPayUWebhook',
    });

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

        logger.info('Payment status updated in database', {
          requestId,
          paymentId: txnid,
          orderId: order.id,
          paymentStatus: 'SUCCESS',
          functionName: 'processPayUWebhook transaction',
        });

        logger.info('Order status updated in database', {
          requestId,
          paymentId: txnid,
          orderId: order.id,
          orderStatus: 'PROCESSING',
          functionName: 'processPayUWebhook transaction',
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

        logger.info('Payment status updated in database', {
          requestId,
          paymentId: txnid,
          orderId: order.id,
          paymentStatus: 'FAILED',
          functionName: 'processPayUWebhook transaction',
        });

        logger.info('Order status updated in database', {
          requestId,
          paymentId: txnid,
          orderId: order.id,
          orderStatus: 'CANCELLED',
          functionName: 'processPayUWebhook transaction',
        });

        // Restore stock since order failed
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: { stockQty: { increment: item.quantity } },
          });
        }

        logger.info('Inventory restored for failed/cancelled order', {
          requestId,
          paymentId: txnid,
          orderId: order.id,
          functionName: 'processPayUWebhook transaction',
          items: order.items.map(item => ({
            variantId: item.productVariantId,
            quantity: item.quantity,
          })),
        });

        await tx.processedWebhook.create({
          data: { webhookId, paymentId: txnid, status: 'failure' },
        });

        return false;
      }

      return false;
    });

    logger.info('Webhook transaction committed successfully', {
      requestId,
      paymentId: txnid,
      functionName: 'processPayUWebhook',
      result: 'SUCCESS',
    });

    // Send both emails (customer + owner) asynchronously on success
    if (isSuccess && status === 'success') {
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

        sendOrderEmails(emailData, requestId).catch((err: any) => {
          logger.error('Order email orchestration failed', err, {
            requestId,
            orderId: updatedOrder.id,
            paymentId: txnid,
            functionName: 'processPayUWebhook',
          });
        });
      }
    }

    logger.info('PayU webhook processing completed', {
      requestId,
      paymentId: txnid,
      functionName: 'processPayUWebhook',
      result: 'SUCCESS',
    });

    return isSuccess;
  } catch (error: any) {
    logger.error('PayU webhook processing failed at service level', error, {
      requestId,
      paymentId: txnid,
      functionName: 'processPayUWebhook',
      result: 'FAILURE',
    });
    throw error;
  }
};
