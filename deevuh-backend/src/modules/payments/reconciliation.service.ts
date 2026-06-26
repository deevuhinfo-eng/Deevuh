import crypto from 'crypto';
import prisma from '../../config/database.js';
import { sendOrderConfirmationEmail } from '../auth/email.service.js';

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
      console.error(`[Reconciliation] PayU Web Service returned HTTP error: ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as PayUVerifyResponse;
    if (data.status === 1 && data.transaction_details && data.transaction_details[txnid]) {
      return data.transaction_details[txnid];
    }
  } catch (error: any) {
    console.error(`[Reconciliation] Error calling PayU verify_payment for ${txnid}:`, error.message);
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
  console.log('[Reconciliation] Starting run...');

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
          errors.push(`Amount mismatch for order ${order.id}: Local total ₹${orderAmount}, PayU paid ₹${paidAmount}`);
          continue;
        }

        if (localPaymentStatus !== 'SUCCESS') {
          correctedCount++;

          try {
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

            // Send confirmation email asynchronously outside transaction
            const updatedOrder = await prisma.order.findUnique({
              where: { id: order.id },
              include: { user: true },
            });
            if (updatedOrder?.user?.email) {
              sendOrderConfirmationEmail(updatedOrder.user.email, {
                orderId: updatedOrder.id,
                customerName: updatedOrder.shippingName,
                finalAmount: Number(updatedOrder.finalAmount),
                shippingAddress: updatedOrder.shippingAddress,
              }).catch((e: any) => console.error(`[Reconciliation] Confirmation email failed: ${e.message}`));
            }
          } catch (err: any) {
            errors.push(`Failed to reconcile order ${order.id}: ${err.message}`);
          }
        }
      }
    }
  } catch (globalErr: any) {
    errors.push(`Global reconciliation error: ${globalErr.message}`);
  }

  const runResult = {
    timestamp: new Date().toISOString(),
    processed: processedCount,
    corrected: correctedCount,
    errors,
    report,
  };

  lastReconciliationRunReport = runResult;
  console.log(`[Reconciliation] Complete: Checked ${processedCount}, Corrected ${correctedCount}, Errors: ${errors.length}`);
  return runResult;
}
