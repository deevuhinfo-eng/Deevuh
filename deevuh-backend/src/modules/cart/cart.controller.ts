import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthenticatedRequest } from '../../middleware/adminGuard';

export const getCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated.' });
      return;
    }

    let cart = await prisma.cart.findFirst({
      where: { userId: req.user.id, status: 'active' },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true, title: true, category: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.id, status: 'active', lastActivityAt: new Date() },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: { id: true, title: true, category: true },
                  },
                },
              },
            },
          },
        },
      });
    }

    res.status(200).json({ status: 'success', data: cart });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const addToCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated.' });
      return;
    }

    const { productVariantId, quantity } = req.body;

    if (!productVariantId || !quantity || quantity < 1) {
      res.status(400).json({ status: 'error', message: 'productVariantId and quantity (>= 1) are required.' });
      return;
    }

    // Verify variant exists and has enough stock
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
    let cart = await prisma.cart.findFirst({
      where: { userId: req.user.id, status: 'active' },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: req.user.id, status: 'active', lastActivityAt: new Date() },
      });
    }

    // Check if item already exists in cart
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
        data: {
          cartId: cart.id,
          productVariantId,
          quantity,
        },
      });
    }

    // Update lastActivityAt
    await prisma.cart.update({
      where: { id: cart.id },
      data: { lastActivityAt: new Date() },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, title: true, category: true } },
              },
            },
          },
        },
      },
    });

    res.status(200).json({ status: 'success', data: updatedCart });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateCartItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated.' });
      return;
    }

    const { cartItemId, quantity } = req.body;

    if (!cartItemId || quantity === undefined || quantity < 0) {
      res.status(400).json({ status: 'error', message: 'cartItemId and quantity (>= 0) are required.' });
      return;
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== req.user.id) {
      res.status(404).json({ status: 'error', message: 'Cart item not found.' });
      return;
    }

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: cartItemId } });
    } else {
      await prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
      });
    }

    // Update lastActivityAt
    await prisma.cart.update({
      where: { id: cartItem.cartId },
      data: { lastActivityAt: new Date() },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, title: true, category: true } },
              },
            },
          },
        },
      },
    });

    res.status(200).json({ status: 'success', data: updatedCart });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const removeFromCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated.' });
      return;
    }

    const { cartItemId } = req.body;

    if (!cartItemId) {
      res.status(400).json({ status: 'error', message: 'cartItemId is required.' });
      return;
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem || cartItem.cart.userId !== req.user.id) {
      res.status(404).json({ status: 'error', message: 'Cart item not found.' });
      return;
    }

    await prisma.cartItem.delete({ where: { id: cartItemId } });

    // Update lastActivityAt
    await prisma.cart.update({
      where: { id: cartItem.cartId },
      data: { lastActivityAt: new Date() },
    });

    res.status(200).json({ status: 'success', message: 'Item removed from cart.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
