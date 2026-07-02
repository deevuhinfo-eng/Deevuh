import { Router, Response } from 'express';
import prisma from '../../config/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { customerGuard } from '../../middleware/customerGuard.js';

const router = Router();

// GET /api/wishlist - Retrieve user's wishlist
router.get('/', authMiddleware, customerGuard, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized.' });
      return;
    }

    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true,
            variants: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedProducts = items.map(item => ({
      id: item.product.id,
      title: item.product.title,
      price: Number(item.product.basePrice),
      category: item.product.category,
      description: item.product.description,
      images: item.product.images.map(img => img.imageUrl),
      sizes: Array.from(new Set(item.product.variants.map(v => v.size))),
      details: ["Premium handcrafted fabric", "Made in India"]
    }));

    res.status(200).json({ status: 'success', data: formattedProducts });
  } catch (error: any) {
    console.error('[Get Wishlist Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
  }
});

// POST /api/wishlist/:productId - Add product to wishlist
router.post('/:productId', authMiddleware, customerGuard, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const productId = req.params.productId as string;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized.' });
      return;
    }

    // Verify product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ status: 'error', message: 'Product not found.' });
      return;
    }

    // Add to wishlist (use upsert or check)
    const item = await prisma.wishlistItem.upsert({
      where: {
        user_product_unique: { userId, productId }
      },
      create: { userId, productId },
      update: {} // No-op if already exists
    });

    res.status(201).json({ status: 'success', message: 'Added to wishlist.', data: item });
  } catch (error: any) {
    console.error('[Add to Wishlist Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
  }
});

// DELETE /api/wishlist/:productId - Remove product from wishlist
router.delete('/:productId', authMiddleware, customerGuard, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const productId = req.params.productId as string;

    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Unauthorized.' });
      return;
    }

    await prisma.wishlistItem.deleteMany({
      where: { userId, productId }
    });

    res.status(200).json({ status: 'success', message: 'Removed from wishlist.' });
  } catch (error: any) {
    console.error('[Remove from Wishlist Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
  }
});

export default router;
