import prisma from '../../config/database.js';
import { sendCustomerConfirmationEmail, sendOwnerNotificationEmail, type OrderEmailData } from '../auth/email.service.js';

const MAX_RETRIES = 3;

/**
 * Backoff schedule in seconds: 30s, 2min, 10min
 */
const BACKOFF_SECONDS = [30, 120, 600];

/**
 * Retry failed emails with exponential backoff.
 * Called by the cron job every 5 minutes.
 */
export async function retryFailedEmails(): Promise<{ retried: number; succeeded: number; permanentlyFailed: number }> {
  const stats = { retried: 0, succeeded: 0, permanentlyFailed: 0 };

  try {
    // Find all failed emails that haven't exceeded max retries
    const failedEmails = await prisma.emailLog.findMany({
      where: {
        status: 'FAILED',
        retryCount: { lt: MAX_RETRIES },
      },
      orderBy: { createdAt: 'asc' },
      take: 20, // Process at most 20 per cycle to avoid overload
    });

    if (failedEmails.length === 0) return stats;

    console.log(`[EmailRetry] Found ${failedEmails.length} failed email(s) to retry`);

    for (const emailLog of failedEmails) {
      // Check backoff: don't retry too soon
      const backoffMs = (BACKOFF_SECONDS[Math.min(emailLog.retryCount, BACKOFF_SECONDS.length - 1)] || 600) * 1000;
      const nextRetryAt = new Date(emailLog.updatedAt.getTime() + backoffMs);

      if (new Date() < nextRetryAt) {
        continue; // Not yet time to retry
      }

      stats.retried++;

      try {
        // Fetch the order data needed to rebuild the email
        const order = await prisma.order.findUnique({
          where: { id: emailLog.orderId },
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
            user: true,
          },
        });

        if (!order) {
          console.error(`[EmailRetry] Order ${emailLog.orderId} not found — marking permanently failed`);
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: 'PERMANENTLY_FAILED', lastError: 'Order not found' },
          });
          stats.permanentlyFailed++;
          continue;
        }

        const emailData: OrderEmailData = {
          orderId: order.id,
          customerName: order.shippingName,
          customerEmail: order.user?.email || emailLog.recipient,
          customerPhone: order.shippingPhone,
          shippingAddress: order.shippingAddress,
          totalAmount: Number(order.totalAmount),
          discountAmount: Number(order.discountAmount),
          gstAmount: Number(order.gstAmount),
          finalAmount: Number(order.finalAmount),
          paymentGatewayTxnId: order.paymentGatewayTxnId || '',
          paymentMethod: 'PayU',
          items: order.items.map((item: any) => ({
            productTitle: item.variant?.product?.title || 'Tailored Garment',
            size: item.variant?.size || 'Custom',
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
          })),
        };

        let result: { messageId?: string; error?: string };

        if (emailLog.emailType === 'customer_confirmation') {
          result = await sendCustomerConfirmationEmail(emailData);
        } else if (emailLog.emailType === 'owner_notification') {
          result = await sendOwnerNotificationEmail(emailData);
        } else {
          console.error(`[EmailRetry] Unknown email type: ${emailLog.emailType}`);
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: 'PERMANENTLY_FAILED', lastError: `Unknown email type: ${emailLog.emailType}` },
          });
          stats.permanentlyFailed++;
          continue;
        }

        if (result.error) {
          const newRetryCount = emailLog.retryCount + 1;
          const newStatus = newRetryCount >= MAX_RETRIES ? 'PERMANENTLY_FAILED' : 'FAILED';

          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: {
              retryCount: newRetryCount,
              lastError: result.error,
              status: newStatus,
            },
          });

          if (newStatus === 'PERMANENTLY_FAILED') {
            console.error(`[EmailRetry] Permanently failed ${emailLog.emailType} for order ${emailLog.orderId} after ${MAX_RETRIES} retries`);
            stats.permanentlyFailed++;
          }
        } else {
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: {
              status: 'SENT',
              resendMessageId: result.messageId || null,
              sentAt: new Date(),
              lastError: null,
              retryCount: emailLog.retryCount + 1,
            },
          });
          console.log(`[EmailRetry] Successfully retried ${emailLog.emailType} for order ${emailLog.orderId}`);
          stats.succeeded++;
        }
      } catch (err: any) {
        console.error(`[EmailRetry] Unexpected error retrying email ${emailLog.id}:`, err.message);
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            retryCount: emailLog.retryCount + 1,
            lastError: err.message,
            status: emailLog.retryCount + 1 >= MAX_RETRIES ? 'PERMANENTLY_FAILED' : 'FAILED',
          },
        }).catch(() => {}); // Swallow update errors
      }
    }

    console.log(`[EmailRetry] Completed: ${stats.retried} retried, ${stats.succeeded} succeeded, ${stats.permanentlyFailed} permanently failed`);
  } catch (err: any) {
    console.error('[EmailRetry] Fatal error in retry loop:', err.message);
  }

  return stats;
}
