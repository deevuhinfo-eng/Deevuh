import { Response } from 'express';
import { OrderStatus } from '@prisma/client';
import prisma from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/adminGuard.js';

export const getAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const salesAggregate = await prisma.order.aggregate({
      where: { paymentStatus: 'SUCCESS' },
      _sum: { finalAmount: true },
      _count: { id: true },
      _avg: { finalAmount: true },
    });

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const abandonedCartsCount = await prisma.cart.count({
      where: {
        status: 'active',
        lastActivityAt: { lte: thirtyMinutesAgo },
      },
    });

    const totalCustomers = await prisma.user.count();
    const totalProducts = await prisma.product.count({ where: { isActive: true } });

    // Daily sales for the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await prisma.order.findMany({
      where: { paymentStatus: 'SUCCESS', createdAt: { gte: sevenDaysAgo } },
      select: { finalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json({
      status: 'success',
      data: {
        grossRevenue: salesAggregate._sum.finalAmount || 0,
        totalPaidOrders: salesAggregate._count.id || 0,
        averageOrderValue: salesAggregate._avg.finalAmount || 0,
        activeAbandonedCarts: abandonedCartsCount,
        totalCustomers,
        totalProducts,
        recentOrders,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getAbandonedCarts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const totalCount = await prisma.cart.count({
      where: {
        status: 'active',
        lastActivityAt: { lte: thirtyMinutesAgo },
      },
    });

    const abandonedCarts = await prisma.cart.findMany({
      skip,
      take: limit,
      where: {
        status: 'active',
        lastActivityAt: { lte: thirtyMinutesAgo },
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: {
          include: {
            variant: {
              include: { product: { select: { title: true, basePrice: true } } },
            },
          },
        },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    res.status(200).json({
      status: 'success',
      data: abandonedCarts,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [orderCount, productCount, userCount, recentOrders] = await Promise.all([
      prisma.order.count({ where: { paymentStatus: 'SUCCESS' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.order.findMany({
        where: { paymentStatus: 'SUCCESS' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    res.status(200).json({
      status: 'success',
      data: { orderCount, productCount, userCount, recentOrders },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const listAllOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const totalCount = await prisma.order.count();

    const orders = await prisma.order.findMany({
      skip,
      take: limit,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: { images: true }
                }
              }
            }
          }
        },
        coupon: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      finalAmount: String(order.finalAmount),
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt.toISOString(),
      user: order.user ? {
        name: order.user.name || '',
        email: order.user.email,
        phone: order.user.phone || '',
      } : undefined,
      items: order.items.map((item) => ({
        quantity: item.quantity,
        variant: {
          size: item.variant.size,
          price: String(item.variant.price),
          product: {
            title: item.variant.product.title,
            images: item.variant.product.images.map((img) => img.imageUrl),
          }
        }
      })),
    }));

    res.status(200).json({
      status: 'success',
      data: formattedOrders,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.orderId as string;
    const orderStatus = req.body.orderStatus as OrderStatus;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ status: 'error', message: 'Order not found.' });
      return;
    }

    // State machine validation
    const allowed = VALID_TRANSITIONS[order.orderStatus];
    if (!allowed || !allowed.includes(orderStatus)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid transition: ${order.orderStatus} → ${orderStatus}`,
      });
      return;
    }

    // Atomic state transition update (optimistic concurrency control)
    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        orderStatus: order.orderStatus,
      },
      data: { orderStatus },
    });

    if (result.count === 0) {
      res.status(409).json({
        status: 'error',
        message: 'Order status was updated by another request. Please reload and try again.',
      });
      return;
    }

    const updated = await prisma.order.findUnique({ where: { id: orderId } });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const listAllCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const totalCount = await prisma.user.count();

    const users = await prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedCustomers = await Promise.all(
      users.map(async (u) => {
        const latestOrder = await prisma.order.findFirst({
          where: { userId: u.id },
          orderBy: { createdAt: 'desc' },
          select: { shippingAddress: true }
        });

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || 'N/A',
          address: latestOrder?.shippingAddress || 'No address on file',
          memberSince: u.createdAt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
          sizing: {
            chest: 'Not set',
            waist: 'Not set',
            shoulder: 'Not set',
            height: 'Not set',
            fit: 'Not calibrated',
          }
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: formattedCustomers,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getUploadedAssets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const images = await prisma.productImage.findMany({
      include: {
        product: { select: { title: true, createdAt: true } }
      },
      orderBy: { product: { createdAt: 'desc' } }
    });

    const formattedAssets = images.map((img) => ({
      url: img.imageUrl,
      name: `${img.product?.title || 'Product'} Image`,
      size: 'N/A',
      uploadedAt: img.product?.createdAt 
        ? img.product.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A'
    }));

    res.status(200).json({ status: 'success', data: formattedAssets });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Fast HEAD check utility to verify image URL accessibility.
 */
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

export const validateProductImages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const images = await prisma.productImage.findMany({
      include: { product: { select: { title: true } } }
    });

    const results = [];
    const batchSize = 10;
    
    // Scan in batches to avoid connection limits
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const batchPromises = batch.map(async (img) => {
        const isReachable = await checkUrlReachable(img.imageUrl);
        return {
          id: img.id,
          productId: img.productId,
          productTitle: img.product?.title || 'Unknown',
          imageUrl: img.imageUrl,
          status: isReachable ? 'OK' : 'BROKEN'
        };
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const brokenImages = results.filter((r) => r.status === 'BROKEN');

    res.status(200).json({
      status: 'success',
      data: {
        totalImages: images.length,
        brokenCount: brokenImages.length,
        brokenImages,
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const auditDatabaseConsistency = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // 1. Orphaned orders (orders where user_id does not exist)
    const orders = await prisma.order.findMany({ select: { id: true, userId: true } });
    const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map(u => u.id));
    const orphanedOrders = orders.filter(o => o.userId && !userIds.has(o.userId));

    // 2. Orphaned cart items
    const cartItems = await prisma.cartItem.findMany({ select: { id: true, cartId: true, productVariantId: true } });
    const cartIds = new Set((await prisma.cart.findMany({ select: { id: true } })).map(c => c.id));
    const variantIds = new Set((await prisma.productVariant.findMany({ select: { id: true } })).map(v => v.id));
    const orphanedCartItems = cartItems.filter(ci => !cartIds.has(ci.cartId) || !variantIds.has(ci.productVariantId));

    // 3. Orphaned order items
    const orderItems = await prisma.orderItem.findMany({ select: { id: true, orderId: true, productVariantId: true } });
    const orderIds = new Set(orders.map(o => o.id));
    const orphanedOrderItems = orderItems.filter(oi => !orderIds.has(oi.orderId) || !variantIds.has(oi.productVariantId));

    res.status(200).json({
      status: 'success',
      data: {
        orphanedOrdersCount: orphanedOrders.length,
        orphanedOrders,
        orphanedCartItemsCount: orphanedCartItems.length,
        orphanedCartItems,
        orphanedOrderItemsCount: orphanedOrderItems.length,
        orphanedOrderItems,
        status: (orphanedOrders.length === 0 && orphanedCartItems.length === 0 && orphanedOrderItems.length === 0)
          ? 'CONSISTENT'
          : 'INCONSISTENT'
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
