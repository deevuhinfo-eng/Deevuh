import { Response } from 'express';
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
