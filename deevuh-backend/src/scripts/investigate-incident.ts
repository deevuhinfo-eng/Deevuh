import prisma from '../config/database.js';

async function main() {
  console.log("=== Phase 1 Investigation ===");
  const orderId = '74efdfeb-ce6f-47d7-8b9d-d843e922758a';
  const variantId = '77afa490-4833-4e1d-a47e-11c190f1b64d';

  // 1. Fetch order details
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        include: {
          variant: {
            include: {
              product: true
            }
          }
        }
      }
    }
  });

  if (!order) {
    console.log(`Order ${orderId} not found.`);
  } else {
    console.log("ORDER DATA:");
    console.log(JSON.stringify(order, null, 2));
  }

  // 2. Fetch variant stock
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true }
  });

  if (!variant) {
    console.log(`Variant ${variantId} not found.`);
  } else {
    console.log("\nVARIANT/STOCK DATA:");
    console.log(JSON.stringify(variant, null, 2));
  }

  // 3. Fetch processed webhooks for this payment
  const webhooks = await prisma.processedWebhook.findMany({
    where: { paymentId: order?.paymentGatewayTxnId || 'unknown' }
  });
  console.log("\nPROCESSED WEBHOOKS:");
  console.log(JSON.stringify(webhooks, null, 2));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
