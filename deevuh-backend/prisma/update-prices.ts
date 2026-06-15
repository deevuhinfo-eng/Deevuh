import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating DEEVUH database product prices...\n');

  const priceUpdates = [
    { title: 'Baby Blue Coordset', newPrice: 1999 },
    { title: 'Beige Tailored Set', newPrice: 2699 },
    { title: 'Brown Earthy Coordset', newPrice: 2199 },
    { title: 'Beige Dupatta Set', newPrice: 2199 },
  ];

  for (const update of priceUpdates) {
    const product = await prisma.product.findFirst({
      where: { title: update.title },
    });

    if (!product) {
      console.log(`⚠️ Product not found: "${update.title}"`);
      continue;
    }

    // Update base price
    await prisma.product.update({
      where: { id: product.id },
      data: { basePrice: update.newPrice },
    });

    // Update all variants of this product
    const result = await prisma.productVariant.updateMany({
      where: { productId: product.id },
      data: { price: update.newPrice },
    });

    console.log(`✅ Updated "${update.title}" to ₹${update.newPrice} (and ${result.count} variants)`);
  }

  console.log('\n🎉 Price update finished!');
}

main()
  .catch((e) => {
    console.error('❌ Error updating prices:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
