import { Router } from 'express';
import { getAnalytics, getAbandonedCarts, getDashboard, listAllOrders, updateOrderStatus } from './admin.controller.js';
import { adminGuard } from '../../middleware/adminGuard.js';

const router = Router();

router.get('/dashboard', adminGuard, getDashboard);
router.get('/analytics', adminGuard, getAnalytics);
router.get('/abandoned-carts', adminGuard, getAbandonedCarts);
router.get('/orders', adminGuard, listAllOrders);
router.put('/orders/:orderId/status', adminGuard, updateOrderStatus);

export default router;
