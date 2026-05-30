import cron from 'node-cron';
import prisma from '../config/database.js';

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
 * Cancels orders stuck in PENDING payment status for 30+ minutes.
 */
const unpaidOrderCancelJob = cron.schedule('*/15 * * * *', async () => {
  try {
    const threshold = new Date(Date.now() - UNPAID_ORDER_THRESHOLD_MS);
    const result = await prisma.order.updateMany({
      where: {
        paymentStatus: 'PENDING',
        createdAt: { lte: threshold },
        orderStatus: { not: 'CANCELLED' },
      },
      data: { orderStatus: 'CANCELLED' },
    });
    if (result.count > 0) {
      console.log(`[CRON] Unpaid Order Cancel: Cancelled ${result.count} unpaid order(s).`);
    }
  } catch (error) {
    console.error('[CRON] Unpaid Order Cancel Error:', error);
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

export function initCronJobs(): void {
  cartRecoveryJob.start();
  unpaidOrderCancelJob.start();
  lowStockAlertJob.start();
  console.log('[CRON] All scheduled jobs initialized.');
}

export { cartRecoveryJob, unpaidOrderCancelJob, lowStockAlertJob };
