import { Router, Response } from 'express';
import prisma from '../../config/database.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { adminGuard, AuthenticatedRequest as AdminRequest } from '../../middleware/adminGuard.js';

const router = Router();

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user?.id },
      include: {
        items: {
          include: {
            variant: { include: { product: { select: { title: true, images: true } } } },
          },
        },
        coupon: { select: { code: true, discountType: true, discountValue: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ status: 'success', data: orders });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id as string },
      include: {
        items: {
          include: {
            variant: { include: { product: { include: { images: true } } } },
          },
        },
        coupon: true,
        user: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!order) {
      res.status(404).json({ status: 'error', message: 'Order not found.' });
      return;
    }

    res.status(200).json({ status: 'success', data: order });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.put('/status', adminGuard, async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { orderId, orderStatus } = req.body;

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
});

export default router;
