import prisma from '../../config/database.js';
import { getCODSettings } from '../admin/settings.service.js';

/**
 * Cancel COD orders that have remained in PENDING payment status
 * beyond the configured auto-cancel window.
 *
 * Only orders with stockReserved === false are targeted — no inventory
 * restoration is needed because stock was never deducted for unpaid
 * COD orders.
 *
 * Designed to be called from a cron job (see cronJobs.ts).
 */
export async function cancelStaleCODOrders(): Promise<{ cancelled: number }> {
  const codSettings = await getCODSettings();
  const autoCancelHours = codSettings.autoCancelHours;

  if (autoCancelHours <= 0) {
    console.log('[COD Auto-Cancel] Auto-cancel is disabled (hours ≤ 0). Skipping.');
    return { cancelled: 0 };
  }

  const threshold = new Date(Date.now() - autoCancelHours * 60 * 60 * 1000);

  const staleCODOrders = await prisma.order.findMany({
    where: {
      isCOD: true,
      paymentStatus: 'PENDING',
      stockReserved: false,
      createdAt: { lt: threshold },
    },
  });

  if (staleCODOrders.length === 0) {
    console.log('[COD Auto-Cancel] No stale COD orders found.');
    return { cancelled: 0 };
  }

  let cancelledCount = 0;

  for (const order of staleCODOrders) {
    try {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          orderStatus: 'CANCELLED',
        },
      });

      cancelledCount++;
      console.log(
        `[COD Auto-Cancel] Cancelled order ${order.id} (created ${order.createdAt.toISOString()}, stale for ${autoCancelHours}h+).`
      );
    } catch (error: any) {
      console.error(`[COD Auto-Cancel] Failed to cancel order ${order.id}: ${error.message}`);
    }
  }

  console.log(`[COD Auto-Cancel] Run complete: ${cancelledCount}/${staleCODOrders.length} order(s) cancelled.`);
  return { cancelled: cancelledCount };
}
