import prisma from '../config/database.js';
import { queryPayUTransaction } from '../modules/payments/reconciliation.service.js';

async function main() {
  console.log("=== Phase 5 30-Day Payment Reconciliation ===");
  
  const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  console.log(`Scanning orders created since: ${threshold.toISOString()}`);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: threshold },
    },
    include: {
      items: true,
      user: true
    }
  });

  console.log(`Found ${orders.length} total orders in the last 30 days.`);

  let processedCount = 0;
  let correctedCount = 0;
  const reports: any[] = [];

  for (const order of orders) {
    const txnid = order.paymentGatewayTxnId;
    if (!txnid) {
      // Missing transaction ID
      continue;
    }

    processedCount++;
    console.log(`Checking Transaction ${txnid} for Order ${order.id}...`);
    const payuTxn = await queryPayUTransaction(txnid);

    if (!payuTxn) {
      console.log(`  -> No PayU transaction details found.`);
      continue;
    }

    const payuStatus = payuTxn.status.toLowerCase();
    const localPaymentStatus = order.paymentStatus;
    const localOrderStatus = order.orderStatus;

    if (payuStatus === 'success') {
      const orderAmount = Number(order.finalAmount);
      const paidAmount = Number(payuTxn.amount);

      if (Math.abs(orderAmount - paidAmount) > 0.01) {
        console.warn(`  -> Amount mismatch! Local: ₹${orderAmount}, PayU: ₹${paidAmount}`);
        continue;
      }

      if (localPaymentStatus !== 'SUCCESS') {
        correctedCount++;
        console.log(`  -> PAID BUT stuck in PENDING/CANCELLED status! Fixing...`);

        await prisma.$transaction(async (tx) => {
          // Re-fetch inside transaction
          const currentOrder = await tx.order.findUnique({
            where: { id: order.id },
            include: { items: true }
          });

          if (!currentOrder || currentOrder.paymentStatus === 'SUCCESS') return;

          // If order was cancelled, re-decrement stock
          if (currentOrder.orderStatus === 'CANCELLED') {
            for (const item of currentOrder.items) {
              await tx.productVariant.update({
                where: { id: item.productVariantId },
                data: { stockQty: { decrement: item.quantity } }
              });
            }
          }

          // Update order status
          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'SUCCESS',
              orderStatus: 'PROCESSING'
            }
          });

          // Insert ProcessedWebhook
          const webhookId = `reconciled_30day_${payuTxn.mihpayid || txnid}`;
          await tx.processedWebhook.upsert({
            where: { webhookId },
            update: {},
            create: {
              webhookId,
              paymentId: txnid,
              status: 'success'
            }
          });
        });

        reports.push({
          orderId: order.id,
          paymentStatus: localPaymentStatus,
          orderStatus: localOrderStatus,
          correctStatus: 'SUCCESS/PROCESSING',
          actionTaken: 'Marked SUCCESS, updated status to PROCESSING, re-deducted inventory, logged ProcessedWebhook'
        });
      } else {
        console.log(`  -> Status is consistent (SUCCESS).`);
      }
    } else {
      console.log(`  -> PayU status: ${payuStatus}. Local: ${localPaymentStatus}`);
    }
  }

  console.log("\n--- RECONCILIATION SUMMARY ---");
  console.log(`TOTAL ORDERS SCANNED: ${orders.length}`);
  console.log(`PROCESSED WITH PAYU: ${processedCount}`);
  console.log(`CORRECTED/REPAIRED: ${correctedCount}`);
  
  if (reports.length > 0) {
    console.log("\nREPAIRED ORDERS REPORT:");
    console.table(reports);
  } else {
    console.log("\nAll scanned transactions are consistent with PayU.");
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
