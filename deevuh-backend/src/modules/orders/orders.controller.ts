import { Response } from 'express';
import { prisma } from '../../config/database';
import { AuthenticatedRequest } from '../../middleware/adminGuard';

// Valid order status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const listOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated.' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const whereClause = req.user.role === 'ADMIN' ? {} : { userId: req.user.id };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    res.status(200).json({
      status: 'success',
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated.' });
      return;
    }

    const id = req.params.id as string;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({ status: 'error', message: 'Order not found.' });
      return;
    }

    // Non-admin users can only view their own orders
    if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) {
      res.status(403).json({ status: 'error', message: 'Access denied.' });
      return;
    }

    res.status(200).json({ status: 'success', data: order });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      res.status(400).json({ status: 'error', message: 'orderId and status are required.' });
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ status: 'error', message: 'Order not found.' });
      return;
    }

    const currentStatus = order.orderStatus;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid status transition from ${currentStatus} to ${status}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: status },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    res.status(200).json({ status: 'success', data: updatedOrder });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
