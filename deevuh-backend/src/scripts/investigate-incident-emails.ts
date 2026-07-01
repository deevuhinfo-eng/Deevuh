import prisma from '../config/database.js';

async function main() {
  console.log("=== Checking Processed Webhooks ===");
  const webhooks = await prisma.processedWebhook.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' }
  });
  
  console.log("Found " + webhooks.length + " webhooks:");
  console.log(JSON.stringify(webhooks, null, 2));
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
