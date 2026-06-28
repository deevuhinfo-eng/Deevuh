import { Router } from 'express';
import { getAnalytics, getAbandonedCarts, getDashboard, listAllOrders, updateOrderStatus, listAllCustomers, getUploadedAssets, validateProductImages, auditDatabaseConsistency } from './admin.controller.js';
import { adminGuard } from '../../middleware/adminGuard.js';
import { runReconciliation, getLastReconciliationReport } from '../payments/reconciliation.service.js';
import prisma from '../../config/database.js';

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

// ─── Email Management ───────────────────────────────────────

/**
 * List all failed email deliveries for admin dashboard visibility.
 */
router.get('/emails/failed', adminGuard, async (req, res) => {
  try {
    const failedEmails = await prisma.emailLog.findMany({
      where: {
        status: { in: ['FAILED', 'PERMANENTLY_FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.status(200).json({ status: 'success', data: failedEmails });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * List all email logs (recent, any status).
 */
router.get('/emails', adminGuard, async (req, res) => {
  try {
    const emails = await prisma.emailLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.status(200).json({ status: 'success', data: emails });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * Manual resend a failed email — resets status to FAILED with retryCount=0
 * so the retry cron picks it up on the next cycle.
 */
router.post('/emails/:emailLogId/resend', adminGuard, async (req, res) => {
  try {
    const emailLogId = req.params.emailLogId as string;

    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
    });

    if (!emailLog) {
      res.status(404).json({ status: 'error', message: 'Email log not found.' });
      return;
    }

    if (emailLog.status === 'SENT') {
      res.status(400).json({ status: 'error', message: 'Email was already successfully sent.' });
      return;
    }

    // Reset to FAILED with retryCount=0 so the cron picks it up immediately
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status: 'FAILED',
        retryCount: 0,
        lastError: 'Manual resend triggered by admin',
      },
    });

    res.status(200).json({ status: 'success', message: 'Email queued for retry on next cycle.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
