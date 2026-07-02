import { Router, Response } from 'express';
import prisma from '../../config/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { customerGuard } from '../../middleware/customerGuard.js';

const router = Router();

router.get('/', authMiddleware, customerGuard, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    let cart = await prisma.cart.findFirst({
      where: { userId, status: 'active' },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { include: { images: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      res.status(200).json({ status: 'success', data: { items: [] } });
      return;
    }

    res.status(200).json({ status: 'success', data: cart });
  } catch (error: any) {
    console.error('[Get Cart Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
  }
});

router.post('/add', authMiddleware, customerGuard, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productVariantId, quantity } = req.body;

    // Validate if it is a valid UUID to prevent Prisma findUnique from crashing on invalid Postgres cast!
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!productVariantId || !uuidRegex.test(productVariantId)) {
      res.status(400).json({ status: 'error', message: 'Invalid product variant ID format.' });
      return;
    }

    // Validate variant exists and has stock
    const variant = await prisma.productVariant.findUnique({ where: { id: productVariantId } });
    if (!variant) {
      res.status(404).json({ status: 'error', message: 'Product variant not found.' });
      return;
    }
    if (variant.stockQty < quantity) {
      res.status(400).json({ status: 'error', message: 'Insufficient stock.' });
      return;
    }

    // Get or create active cart
    let cart = await prisma.cart.findFirst({ where: { userId, status: 'active' } });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: userId || null, status: 'active' },
      });
    }

    // Check if item already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productVariantId },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productVariantId, quantity },
      });
    }

    // Touch cart activity
    await prisma.cart.update({
      where: { id: cart.id },
      data: { lastActivityAt: new Date() },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { variant: { include: { product: { include: { images: true } } } } } } },
    });

    res.status(200).json({ status: 'success', data: updatedCart });
  } catch (error: any) {
    console.error('[Add to Cart Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
  }
});

router.put('/update', authMiddleware, customerGuard, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cartItemId, quantity } = req.body;
    if (!cartItemId) {
      res.status(400).json({ status: 'error', message: 'Cart item ID is required.' });
      return;
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true }
    });

    if (!cartItem || !cartItem.cart || cartItem.cart.userId !== req.user?.id) {
      res.status(404).json({ status: 'error', message: 'Cart item not found.' });
      return;
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } });
    } else {
      const variant = await prisma.productVariant.findUnique({
        where: { id: cartItem.productVariantId }
      });
      if (!variant) {
        res.status(404).json({ status: 'error', message: 'Product variant not found.' });
        return;
      }
      if (variant.stockQty < quantity) {
        res.status(400).json({ status: 'error', message: `Insufficient stock. Only ${variant.stockQty} items left.` });
        return;
      }
      await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
    }

    res.status(200).json({ status: 'success', message: 'Cart updated.' });
  } catch (error: any) {
    console.error('[Update Cart Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
  }
});

router.delete('/remove', authMiddleware, customerGuard, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { cartItemId } = req.body;
    if (!cartItemId) {
      res.status(400).json({ status: 'error', message: 'Cart item ID is required.' });
      return;
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true }
    });

    if (!cartItem || !cartItem.cart || cartItem.cart.userId !== req.user?.id) {
      res.status(404).json({ status: 'error', message: 'Cart item not found.' });
      return;
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });
    res.status(200).json({ status: 'success', message: 'Item removed from cart.' });
  } catch (error: any) {
    console.error('[Remove Cart Item Error]', error);
    res.status(500).json({ status: 'error', message: 'Something went wrong.' });
  }
});

export default router;
