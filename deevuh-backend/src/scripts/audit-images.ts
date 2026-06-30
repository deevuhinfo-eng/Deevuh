import prisma from '../config/database.js';

async function checkUrlReachable(url: string, timeoutMs: number = 3000): Promise<boolean> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(id);
    if (response.ok || response.status === 200) {
      return true;
    }
  } catch {
    clearTimeout(id);
  }

  // Fallback to GET
  try {
    const controller2 = new AbortController();
    const id2 = setTimeout(() => controller2.abort(), timeoutMs);
    const res2 = await fetch(url, {
      method: 'GET',
      signal: controller2.signal,
    });
    clearTimeout(id2);
    return res2.ok || res2.status === 200;
  } catch {
    return false;
  }
}

async function main() {
  console.log("=== Phase 7 Image System Audit ===");

  const products = await prisma.product.findMany({
    include: {
      images: true
    }
  });

  const totalProducts = products.length;
  let validImagesCount = 0;
  let brokenImagesCount = 0;
  let missingImagesCount = 0;
  const brokenImagesList: any[] = [];
  const missingImagesList: any[] = [];

  for (const product of products) {
    if (!product.images || product.images.length === 0) {
      missingImagesCount++;
      missingImagesList.push({
        productId: product.id,
        title: product.title
      });
      continue;
    }

    for (const image of product.images) {
      if (!image.imageUrl) {
        brokenImagesCount++;
        brokenImagesList.push({
          productId: product.id,
          title: product.title,
          imageId: image.id,
          imageUrl: image.imageUrl,
          reason: 'Empty URL'
        });
        continue;
      }

      const isReachable = await checkUrlReachable(image.imageUrl);
      if (isReachable) {
        validImagesCount++;
      } else {
        brokenImagesCount++;
        brokenImagesList.push({
          productId: product.id,
          title: product.title,
          imageId: image.id,
          imageUrl: image.imageUrl,
          reason: 'Unreachable'
        });
      }
    }
  }

  console.log("\n--- IMAGE AUDIT REPORT ---");
  console.log(`TOTAL PRODUCTS: ${totalProducts}`);
  console.log(`VALID IMAGES: ${validImagesCount}`);
  console.log(`BROKEN IMAGES: ${brokenImagesCount}`);
  console.log(`MISSING IMAGES: ${missingImagesCount}`);
  
  if (brokenImagesList.length > 0) {
    console.log("\nBroken Images List:");
    console.log(JSON.stringify(brokenImagesList, null, 2));
  }
  if (missingImagesList.length > 0) {
    console.log("\nMissing Images List:");
    console.log(JSON.stringify(missingImagesList, null, 2));
  }
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
