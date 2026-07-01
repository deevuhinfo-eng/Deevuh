import cron from 'node-cron';
import prisma from '../config/database.js';
import { runReconciliation } from '../modules/payments/reconciliation.service.js';
import { retryFailedEmails } from '../modules/payments/email-retry.service.js';
import { cancelStaleCODOrders } from '../modules/payments/cod-auto-cancel.service.js';

const ABANDONED_CART_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const UNPAID_ORDER_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const LOW_STOCK_THRESHOLD = 5;

/**
 * Cart Recovery Cron — Every 6 hours
 * Marks active carts with no activity for 30+ minutes as abandoned.
 */
const cartRecoveryJob = cron.schedule('0 */6 * * *', async () => {
  try {
    const threshold = new Date(Date.now() - ABANDONED_CART_THRESHOLD_MS);
    const result = await prisma.cart.updateMany({
      where: {
        status: 'active',
        lastActivityAt: { lte: threshold },
      },
      data: { status: 'abandoned' },
    });
    if (result.count > 0) {
      console.log(`[CRON] Cart Recovery: Marked ${result.count} cart(s) as abandoned.`);
    }
  } catch (error) {
    console.error('[CRON] Cart Recovery Error:', error);
  }
});

/**
 * Unpaid Order Cancellation — Every 15 minutes
 * Cancels online orders stuck in PENDING payment status for 30+ minutes.
 */
const unpaidOrderCancelJob = cron.schedule('*/15 * * * *', async () => {
  try {
    const threshold = new Date(Date.now() - UNPAID_ORDER_THRESHOLD_MS);
    const ordersToCancel = await prisma.order.findMany({
      where: {
        isCOD: { not: true },
        paymentStatus: 'PENDING',
        createdAt: { lte: threshold },
        orderStatus: { not: 'CANCELLED' },
      },
      include: {
        items: true,
      },
    });

    for (const order of ordersToCancel) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            orderStatus: 'CANCELLED',
            paymentStatus: 'FAILED',
            stockReserved: false,
          },
        });

        // Restore stock only if it was actually reserved
        if (order.stockReserved) {
          for (const item of order.items) {
            await tx.productVariant.update({
              where: { id: item.productVariantId },
              data: { stockQty: { increment: item.quantity } },
            });
          }
        }
      });
      console.log(`[CRON] Unpaid Order Cancel: Cancelled order ${order.id} (stock restored: ${order.stockReserved}).`);
    }

    if (ordersToCancel.length > 0) {
      console.log(`[CRON] Unpaid Order Cancel: Cancelled ${ordersToCancel.length} unpaid online order(s).`);
    }
  } catch (error) {
    console.error('[CRON] Unpaid Order Cancel Error:', error);
  }
});

/**
 * COD Auto-Cancellation — Every hour
 * Cancels unconfirmed COD orders that exceeded the settings threshold.
 */
const codAutoCancelJob = cron.schedule('0 * * * *', async () => {
  try {
    const result = await cancelStaleCODOrders();
    if (result.cancelled > 0) {
      console.log(`[CRON] COD Auto-Cancel: Cancelled ${result.cancelled} stale COD order(s).`);
    }
  } catch (error) {
    console.error('[CRON] COD Auto-Cancel Error:', error);
  }
});

/**
 * Low Stock Alert — Every 6 hours
 * Logs warnings for product variants with stock below threshold.
 */
const lowStockAlertJob = cron.schedule('0 */6 * * *', async () => {
  try {
    const lowStockVariants = await prisma.productVariant.findMany({
      where: { stockQty: { lt: LOW_STOCK_THRESHOLD } },
      include: {
        product: { select: { title: true, id: true } },
      },
    });
    if (lowStockVariants.length > 0) {
      console.warn(`[CRON] Low Stock Alert: ${lowStockVariants.length} variant(s) below threshold:`);
      lowStockVariants.forEach((v) => {
        console.warn(`  → ${v.product.title} [${v.size}]: ${v.stockQty} units remaining`);
      });
    }
  } catch (error) {
    console.error('[CRON] Low Stock Alert Error:', error);
  }
});

/**
 * Payment Reconciliation Cron — Every hour
 * Scans for paid but stuck orders and corrects them.
 */
const reconciliationJob = cron.schedule('0 * * * *', async () => {
  try {
    await runReconciliation();
  } catch (error) {
    console.error('[CRON] Payment Reconciliation Error:', error);
  }
});

/**
 * Email Retry Cron — Every 5 minutes
 * Retries failed email deliveries with exponential backoff.
 */
const emailRetryJob = cron.schedule('*/5 * * * *', async () => {
  try {
    await retryFailedEmails();
  } catch (error) {
    console.error('[CRON] Email Retry Error:', error);
  }
});

export function initCronJobs(): void {
  cartRecoveryJob.start();
  unpaidOrderCancelJob.start();
  codAutoCancelJob.start();
  lowStockAlertJob.start();
  reconciliationJob.start();
  emailRetryJob.start();
  console.log('[CRON] All scheduled jobs initialized (including COD auto-cancel and email retry).');
}

export { cartRecoveryJob, unpaidOrderCancelJob, codAutoCancelJob, lowStockAlertJob, reconciliationJob, emailRetryJob };
