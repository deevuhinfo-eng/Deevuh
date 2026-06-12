import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DEEVUH database...\n');

  // 1. Create Admin User
  const adminPassword = await bcrypt.hash('admin@deevuh2024', 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@deevuh.com' },
    update: {},
    create: {
      email: 'admin@deevuh.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);
  console.log(`   Password: admin@deevuh2024 (change this after first login!)`);

  // 2. Create Real DEEVUH Products with Cloudinary Images
  const products = [
    {
      title: 'Baby Blue Coordset',
      description: 'A beautifully structured baby blue coordset, combining timeless elegance with a contemporary silhouette. Crafted from a premium breathable cotton-silk blend, this matching set features an effortless fluid drape, tailored collar, and clean minimalist finish.',
      basePrice: 3499,
      category: 'Coordset',
      variants: [
        { size: 'XS', price: 3499, stockQty: 5 },
        { size: 'S', price: 3499, stockQty: 10 },
        { size: 'M', price: 3499, stockQty: 15 },
        { size: 'L', price: 3499, stockQty: 12 },
      ],
      images: [
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114405/deevuh/products/baby%20blue%20coordset/1%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114415/deevuh/products/baby%20blue%20coordset/2%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114427/deevuh/products/baby%20blue%20coordset/3%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114437/deevuh/products/baby%20blue%20coordset/4%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114451/deevuh/products/baby%20blue%20coordset/5%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114461/deevuh/products/baby%20blue%20coordset/6%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114476/deevuh/products/baby%20blue%20coordset/7%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114509/deevuh/products/baby%20blue%20coordset/dsc_0108.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114538/deevuh/products/baby%20blue%20coordset/dsc_0121.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114566/deevuh/products/baby%20blue%20coordset/dsc_0127.jpg.jpg' },
      ],
    },
    {
      title: 'Beige Tailored Set',
      description: 'An understated and minimalist beige outfit, tailored for maximum comfort and an effortless editorial aesthetic. Features a clean drape, structured lines, and ultra-soft premium fabric.',
      basePrice: 2999,
      category: 'Casual Luxury',
      variants: [
        { size: 'XS', price: 2999, stockQty: 5 },
        { size: 'S', price: 2999, stockQty: 12 },
        { size: 'M', price: 2999, stockQty: 18 },
        { size: 'L', price: 2999, stockQty: 10 },
      ],
      images: [
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114588/deevuh/products/beige%20outfit/1%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114602/deevuh/products/beige%20outfit/2%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114613/deevuh/products/beige%20outfit/3%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114624/deevuh/products/beige%20outfit/4%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114640/deevuh/products/beige%20outfit/5th%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114656/deevuh/products/beige%20outfit/6%20picture.jpg.jpg' },
      ],
    },
    {
      title: 'Brown Earthy Coordset',
      description: 'Deep earthy tones meet modern relaxed tailoring. This premium brown coordset features detailed utility pockets, elegant cuff finishes, and a comfortable yet sharp fit suitable for year-round styling.',
      basePrice: 3299,
      category: 'Coordset',
      variants: [
        { size: 'XS', price: 3299, stockQty: 4 },
        { size: 'S', price: 3299, stockQty: 10 },
        { size: 'M', price: 3299, stockQty: 14 },
        { size: 'L', price: 3299, stockQty: 10 },
        { size: 'XL', price: 3499, stockQty: 5 },
        { size: 'XXL', price: 3499, stockQty: 5 },
      ],
      images: [
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114670/deevuh/products/brown%20coordsets/1st%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114685/deevuh/products/brown%20coordsets/2nd%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114701/deevuh/products/brown%20coordsets/3rd%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114726/deevuh/products/brown%20coordsets/4th%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114741/deevuh/products/brown%20coordsets/5th%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114755/deevuh/products/brown%20coordsets/6th%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114774/deevuh/products/brown%20coordsets/7th%20picture.jpg.jpg' },
      ],
    },
    {
      title: 'Beige Dupatta Set',
      description: 'An exquisite cream-beige set featuring a beautifully crafted coordinating dupatta. Combining traditional grace with modern tailored cuts, this premium outfit offers a sophisticated drape, intricate hand-stitch detailing along the borders.',
      basePrice: 4299,
      category: 'Traditional Luxury',
      variants: [
        { size: 'XS', price: 4299, stockQty: 3 },
        { size: 'S', price: 4299, stockQty: 8 },
        { size: 'M', price: 4299, stockQty: 10 },
        { size: 'L', price: 4299, stockQty: 6 },
      ],
      images: [
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114854/deevuh/products/dupatta%20beige%20outfit/1st%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114863/deevuh/products/dupatta%20beige%20outfit/2nd%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114880/deevuh/products/dupatta%20beige%20outfit/3rd%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114893/deevuh/products/dupatta%20beige%20outfit/4th%20picture.jpg.jpg' },
        { imageUrl: 'https://res.cloudinary.com/dnj50tf7s/image/upload/f_auto,q_auto/v1780114906/deevuh/products/dupatta%20beige%20outfit/5th%20picture.jpg.jpg' },
      ],
    },
  ];

  for (const product of products) {
    const created = await prisma.product.upsert({
      where: { id: '00000000-0000-0000-0000-000000000000' }, // Force create path
      update: {},
      create: {
        title: product.title,
        description: product.description,
        basePrice: product.basePrice,
        category: product.category,
        variants: { create: product.variants },
        images: { create: product.images },
      },
    }).catch(async () => {
      // If upsert fails, try direct create (for idempotency)
      const existing = await prisma.product.findFirst({ where: { title: product.title } });
      if (existing) {
        console.log(`   (already exists: ${product.title})`);
        return existing;
      }
      return prisma.product.create({
        data: {
          title: product.title,
          description: product.description,
          basePrice: product.basePrice,
          category: product.category,
          variants: { create: product.variants },
          images: { create: product.images },
        },
      });
    });
    console.log(`✅ Product: ${created.title} (${product.variants.length} variants, ${product.images.length} images)`);
  }

  // 3. Create Coupons
  const coupons = [
    {
      code: 'WELCOME10',
      discountType: 'percentage',
      discountValue: 10,
      expiresAt: new Date('2026-12-31T23:59:59Z'),
      minPurchase: 999,
      maxUses: 100,
    },
    {
      code: 'FLAT500',
      discountType: 'flat',
      discountValue: 500,
      expiresAt: new Date('2026-12-31T23:59:59Z'),
      minPurchase: 2000,
      maxUses: 50,
    },
    {
      code: 'DEEVUH15',
      discountType: 'percentage',
      discountValue: 15,
      expiresAt: new Date('2026-12-31T23:59:59Z'),
      minPurchase: 3000,
      maxUses: 30,
    },
  ];

  for (const coupon of coupons) {
    const created = await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: coupon,
    });
    console.log(`✅ Coupon: ${created.code} (${created.discountType}: ${created.discountValue})`);
  }

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Admin Credentials:');
  console.log('   Email: admin@deevuh.com');
  console.log('   Password: admin@deevuh2024');
  console.log('   ⚠️  Change this password immediately after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
