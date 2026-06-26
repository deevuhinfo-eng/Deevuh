import { Router } from 'express';
import { getAnalytics, getAbandonedCarts, getDashboard, listAllOrders, updateOrderStatus, listAllCustomers, getUploadedAssets, validateProductImages, auditDatabaseConsistency } from './admin.controller.js';
import { adminGuard } from '../../middleware/adminGuard.js';
import { runReconciliation, getLastReconciliationReport } from '../payments/reconciliation.service.js';

const router = Router();

router.get('/dashboard', adminGuard, getDashboard);
router.get('/analytics', adminGuard, getAnalytics);
router.get('/abandoned-carts', adminGuard, getAbandonedCarts);
router.get('/orders', adminGuard, listAllOrders);
router.put('/orders/:orderId/status', adminGuard, updateOrderStatus);
router.get('/customers', adminGuard, listAllCustomers);
router.get('/uploads', adminGuard, getUploadedAssets);
router.get('/audit/images', adminGuard, validateProductImages);
router.get('/audit/consistency', adminGuard, auditDatabaseConsistency);

router.post('/reconciliation/run', adminGuard, async (req, res) => {
  try {
    const result = await runReconciliation();
    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/reconciliation/report', adminGuard, (req, res) => {
  const report = getLastReconciliationReport();
  if (!report) {
    res.status(200).json({ status: 'success', message: 'No reconciliation run has been executed yet.' });
  } else {
    res.status(200).json({ status: 'success', data: report });
  }
});

export default router;
