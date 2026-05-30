import { Response } from 'express';
import prisma from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/adminGuard.js';

export const createCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, discountType, discountValue, expiresAt, minPurchase, maxUses } = req.body;

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      res.status(409).json({ status: 'error', message: 'Coupon code already exists.' });
      return;
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        expiresAt: new Date(expiresAt),
        minPurchase: minPurchase || null,
        maxUses: maxUses || null,
      },
    });

    res.status(201).json({ status: 'success', data: coupon });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id as string },
      data: {
        ...req.body,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        code: req.body.code ? req.body.code.toUpperCase() : undefined,
      },
    });
    res.status(200).json({ status: 'success', data: coupon });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id as string } });
    res.status(200).json({ status: 'success', message: 'Coupon deleted.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const listCoupons = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
    res.status(200).json({ status: 'success', data: coupons });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const validateCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, cartTotal } = req.body;
    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon) {
      res.status(404).json({ status: 'error', message: 'Coupon not found.' });
      return;
    }
    if (!coupon.isActive) {
      res.status(400).json({ status: 'error', message: 'Coupon is inactive.' });
      return;
    }
    if (new Date() > coupon.expiresAt) {
      res.status(400).json({ status: 'error', message: 'Coupon has expired.' });
      return;
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ status: 'error', message: 'Coupon usage limit reached.' });
      return;
    }
    if (coupon.minPurchase && cartTotal < Number(coupon.minPurchase)) {
      res.status(400).json({
        status: 'error',
        message: `Minimum purchase of ₹${coupon.minPurchase} required.`,
      });
      return;
    }

    const discount = coupon.discountType === 'percentage'
      ? Math.round(cartTotal * Number(coupon.discountValue) / 100 * 100) / 100
      : Number(coupon.discountValue);

    res.status(200).json({
      status: 'success',
      data: { coupon, discountAmount: discount },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
