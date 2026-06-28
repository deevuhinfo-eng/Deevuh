import crypto from 'crypto';
import prisma from '../../config/database.js';
import { sendOrderEmails, type OrderEmailData } from '../auth/email.service.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

interface PayUTransactionDetails {
  mihpayid: string;
  status: string;
  amount: string;
  mode: string;
  additional_charges?: string;
}

interface PayUVerifyResponse {
  status: number;
  msg: string;
  transaction_details?: Record<string, PayUTransactionDetails>;
}

// Temporary in-memory log for the admin report endpoint
let lastReconciliationRunReport: any = null;

export const getLastReconciliationReport = () => {
  return lastReconciliationRunReport;
};

/**
 * Queries PayU transaction details using the verify_payment Web Services API.
 */
export async function queryPayUTransaction(txnid: string): Promise<PayUTransactionDetails | null> {
  // If we are in test environment, return a mock response to ensure automated tests run cleanly
  if (process.env.NODE_ENV === 'test' || process.env.PAYU_MERCHANT_KEY === 'DISABLED') {
    // For test scenarios, return a mock details object if simulated in test context
    if ((globalThis as any).mockPayUResponses && (globalThis as any).mockPayUResponses[txnid]) {
      return (globalThis as any).mockPayUResponses[txnid];
    }
    return null;
  }

  const key = process.env.PAYU_MERCHANT_KEY || '';
  const salt = process.env.PAYU_MERCHANT_SALT || '';
  const isProd = process.env.PAYU_ENVIRONMENT === 'production';
  const url = isProd
    ? 'https://info.payu.in/merchant/postservice?form=2'
    : 'https://test.payu.in/merchant/postservice?form=2';

  const command = 'verify_payment';

  // Hash sequence: key|command|var1|salt
  const hashSeq = `${key}|${command}|${txnid}|${salt}`;
  const hash = crypto.createHash('sha512').update(hashSeq).digest('hex');

  const params = new URLSearchParams();
  params.append('key', key);
  params.append('command', command);
  params.append('var1', txnid);
  params.append('hash', hash);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      logger.error('PayU verify_payment web service returned HTTP error', new Error(response.statusText), {
        paymentId: txnid,
        functionName: 'queryPayUTransaction',
        httpStatus: response.status,
      });
      return null;
    }

    const data = (await response.json()) as PayUVerifyResponse;
    if (data.status === 1 && data.transaction_details && data.transaction_details[txnid]) {
      return data.transaction_details[txnid];
    }
  } catch (error: any) {
    logger.error('Error calling PayU verify_payment', error, {
      paymentId: txnid,
      functionName: 'queryPayUTransaction',
    });
  }
  return null;
}

/**
 * Scan database orders from the last 48 hours that are pending/cancelled,
 * compare with PayU transaction records, and auto-correct.
 */
export async function runReconciliation(): Promise<{
  processed: number;
  corrected: number;
  errors: string[];
  report: string[];
}> {
  const reconRequestId = `recon-${uuidv4().substring(0, 8)}`;
  logger.info('Reconciliation process started', {
    requestId: reconRequestId,
    functionName: 'runReconciliation',
  });

  const report: string[] = [];
  const errors: string[] = [];
  let processedCount = 0;
  let correctedCount = 0;

  try {
    // Check orders from the last 48 hours
    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const ordersToCheck = await prisma.order.findMany({
      where: {
        createdAt: { gte: threshold },
        OR: [
          { paymentStatus: 'PENDING' },
          { orderStatus: 'CANCELLED' },
        ],
      },
      include: {
        items: true,
      },
    });

    for (const order of ordersToCheck) {
      const txnid = order.paymentGatewayTxnId;
      if (!txnid) continue;

      processedCount++;

      const payuTxn = await queryPayUTransaction(txnid);
      if (!payuTxn) {
        continue;
      }

      const payuStatus = payuTxn.status.toLowerCase();
      const localPaymentStatus = order.paymentStatus;

      // Detect "paid but pending" or "paid but cancelled"
      if (payuStatus === 'success') {
        const orderAmount = Number(order.finalAmount);
        const paidAmount = Number(payuTxn.amount);

        if (Math.abs(orderAmount - paidAmount) > 0.01) {
          const mismatchMsg = `Amount mismatch for order ${order.id}: Local total ₹${orderAmount}, PayU paid ₹${paidAmount}`;
          errors.push(mismatchMsg);
          logger.warn(mismatchMsg, {
            requestId: reconRequestId,
            orderId: order.id,
            paymentId: txnid,
            functionName: 'runReconciliation',
          });
          continue;
        }

        if (localPaymentStatus !== 'SUCCESS') {
          correctedCount++;

          try {
            logger.info('Reconciliation database transaction started', {
              requestId: reconRequestId,
              orderId: order.id,
              paymentId: txnid,
              functionName: 'runReconciliation',
            });

            await prisma.$transaction(async (tx) => {
              // Re-query order state within transaction boundary to prevent race conditions
              const currentOrder = await tx.order.findUnique({
                where: { id: order.id },
                include: { items: true },
              });

              if (!currentOrder || currentOrder.paymentStatus === 'SUCCESS') return;

              // If order was cancelled (e.g. by cron timeout), we must re-decrement inventory!
              if (currentOrder.orderStatus === 'CANCELLED') {
                report.push(`[Corrected] Order ${order.id} was CANCELLED but verified as PAID on PayU. Re-reserving inventory and marking paid.`);

                for (const item of currentOrder.items) {
                  // Decrement stockQty
                  await tx.productVariant.update({
                    where: { id: item.productVariantId },
                    data: { stockQty: { decrement: item.quantity } },
                  });
                }

                logger.info('Inventory restored and re-reserved for corrected order', {
                  requestId: reconRequestId,
                  orderId: order.id,
                  paymentId: txnid,
                  functionName: 'runReconciliation transaction',
                });
              } else {
                report.push(`[Corrected] Order ${order.id} was PENDING but verified as PAID on PayU. Marking paid.`);
              }

              // Update order status to paid / processing
              await tx.order.update({
                where: { id: order.id },
                data: {
                  paymentStatus: 'SUCCESS',
                  orderStatus: 'PROCESSING',
                },
              });

              logger.info('Payment status updated in database (Reconciliation)', {
                requestId: reconRequestId,
                orderId: order.id,
                paymentId: txnid,
                paymentStatus: 'SUCCESS',
                functionName: 'runReconciliation transaction',
              });

              logger.info('Order status updated in database (Reconciliation)', {
                requestId: reconRequestId,
                orderId: order.id,
                paymentId: txnid,
                orderStatus: 'PROCESSING',
                functionName: 'runReconciliation transaction',
              });

              // Record the webhook execution
              const webhookId = `reconciled_${payuTxn.mihpayid || txnid}`;
              await tx.processedWebhook.upsert({
                where: { webhookId },
                update: {},
                create: {
                  webhookId,
                  paymentId: txnid,
                  status: 'success',
                },
              });
            });

            logger.info('Reconciliation transaction committed successfully', {
              requestId: reconRequestId,
              orderId: order.id,
              paymentId: txnid,
              functionName: 'runReconciliation',
              result: 'SUCCESS',
            });

            // Send both emails (customer + owner) asynchronously outside transaction
            const updatedOrder = await prisma.order.findUnique({
              where: { id: order.id },
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
                paymentGatewayTxnId: updatedOrder.paymentGatewayTxnId || '',
                paymentMethod: 'PayU',
                items: updatedOrder.items.map((item: any) => ({
                  productTitle: item.variant?.product?.title || 'Tailored Garment',
                  size: item.variant?.size || 'Custom',
                  quantity: item.quantity,
                  unitPrice: Number(item.unitPrice),
                })),
              };
              sendOrderEmails(emailData, reconRequestId).catch((e: any) => {
                logger.error('Reconciliation confirmation emails failed to send', e, {
                  requestId: reconRequestId,
                  orderId: order.id,
                  paymentId: txnid,
                  functionName: 'runReconciliation',
                });
              });
            }
          } catch (err: any) {
            const errMsg = `Failed to reconcile order ${order.id}: ${err.message}`;
            errors.push(errMsg);
            logger.error(errMsg, err, {
              requestId: reconRequestId,
              orderId: order.id,
              paymentId: txnid,
              functionName: 'runReconciliation',
              result: 'FAILURE',
            });
          }
        }
      }
    }
  } catch (globalErr: any) {
    errors.push(`Global reconciliation error: ${globalErr.message}`);
    logger.error('Global reconciliation run failed', globalErr, {
      requestId: reconRequestId,
      functionName: 'runReconciliation',
      result: 'FAILURE',
    });
  }

  const runResult = {
    timestamp: new Date().toISOString(),
    processed: processedCount,
    corrected: correctedCount,
    errors,
    report,
  };

  lastReconciliationRunReport = runResult;
  logger.info('Reconciliation process completed', {
    requestId: reconRequestId,
    processedCount,
    correctedCount,
    errorsCount: errors.length,
    functionName: 'runReconciliation',
    result: 'SUCCESS',
  });
  return runResult;
}
