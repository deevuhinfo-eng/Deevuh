import { Router } from 'express';
import { createCoupon, updateCoupon, deleteCoupon, listCoupons, validateCoupon } from './coupons.controller.js';
import { adminGuard } from '../../middleware/adminGuard.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { z } from 'zod';

const router = Router();

const createCouponSchema = z.object({
  code: z.string().min(3).max(50),
  discountType: z.enum(['percentage', 'flat']),
  discountValue: z.number().positive(),
  expiresAt: z.string().datetime(),
  minPurchase: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
});

router.post('/create', adminGuard, validateRequest(createCouponSchema), createCoupon);
router.put('/:id', adminGuard, updateCoupon);
router.delete('/:id', adminGuard, deleteCoupon);
router.get('/', adminGuard, listCoupons);
router.post('/validate', authMiddleware, validateCoupon);

export default router;
