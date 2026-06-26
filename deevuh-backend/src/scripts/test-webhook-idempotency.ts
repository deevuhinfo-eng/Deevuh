import crypto from 'crypto';
import prisma from '../config/database.js';
import { processPayUWebhook } from '../modules/payments/payments.service.js';

async function main() {
  console.log("=== Phase 4 Webhook Idempotency Verification ===");

  const txnid = `TEST_IDEMP_${Date.now()}`;
  const amount = "100.00";
  const status = "success";
  const productinfo = "Test Order";
  const firstname = "TestCustomer";
  const email = "test@deevuh.in";
  const mihpayid = `mih_${Date.now()}`;

  const key = process.env.PAYU_MERCHANT_KEY || '';
  const salt = process.env.PAYU_MERCHANT_SALT || '';

  // Get active variant for order creation
  const variant = await prisma.productVariant.findFirst();
  if (!variant) {
    throw new Error("No product variants found in database to create test order.");
  }

  // Create a dummy user
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No users found in database to create test order.");
  }

  // 1. Create order in PENDING status
  console.log("Creating dummy order for idempotency test...");
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      shippingAddress: "Test Address",
      shippingName: firstname,
      shippingPhone: "9999999999",
      totalAmount: 100.00,
      discountAmount: 0.00,
      gstAmount: 15.25,
      finalAmount: 100.00,
      paymentGatewayTxnId: txnid,
      paymentStatus: 'PENDING',
      orderStatus: 'CREATED',
      items: {
        create: {
          productVariantId: variant.id,
          quantity: 1,
          unitPrice: 100.00
        }
      }
    }
  });

  console.log(`Created test order ID: ${order.id} with txn ID: ${txnid}`);

  // Calculate PayU reverse hash for verification:
  // salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
  const baseSequence = `${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  const seqWithoutCharges = `${salt}|${baseSequence}`;
  const hash = crypto.createHash('sha512').update(seqWithoutCharges).digest('hex');

  const payload = {
    txnid,
    amount,
    status,
    productinfo,
    firstname,
    email,
    mihpayid,
    hash
  };

  // TEST A: Send webhook once
  console.log("\n--- TEST A: Sending Webhook First Time ---");
  const resultA = await processPayUWebhook(payload);
  console.log(`Test A result (should be true): ${resultA}`);

  // Check database order state and processed webhooks
  const orderAfterA = await prisma.order.findUnique({
    where: { id: order.id }
  });
  console.log(`Order state after Test A: paymentStatus=${orderAfterA?.paymentStatus}, orderStatus=${orderAfterA?.orderStatus}`);

  const webhookRecordA = await prisma.processedWebhook.findUnique({
    where: { webhookId: mihpayid }
  });
  console.log(`ProcessedWebhook record exists:`, JSON.stringify(webhookRecordA, null, 2));

  // TEST B: Send identical webhook again
  console.log("\n--- TEST B: Sending Identical Webhook Second Time ---");
  const resultB = await processPayUWebhook(payload);
  console.log(`Test B result (should be true): ${resultB}`);

  // Verify that ProcessedWebhook table has only one record and no duplicate triggers or errors happened
  const allWebhooks = await prisma.processedWebhook.findMany({
    where: { paymentId: txnid }
  });
  console.log(`Total webhook entries for this transaction (should be 1): ${allWebhooks.length}`);

  // Cleanup
  console.log("\nCleaning up test data...");
  await prisma.orderItem.deleteMany({
    where: { orderId: order.id }
  });
  await prisma.order.delete({
    where: { id: order.id }
  });
  await prisma.processedWebhook.deleteMany({
    where: { paymentId: txnid }
  });
  if (mihpayid) {
    await prisma.processedWebhook.deleteMany({
      where: { webhookId: mihpayid }
    });
  }
  console.log("Idempotency check finished successfully.");
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
