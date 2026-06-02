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
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const abandonedCarts = await prisma.cart.findMany({
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

    res.status(200).json({ status: 'success', data: abandonedCarts });
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
    const orders = await prisma.order.findMany({
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

    res.status(200).json({ status: 'success', data: formattedOrders });
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

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { orderStatus },
    });

    res.status(200).json({ status: 'success', data: updated });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
