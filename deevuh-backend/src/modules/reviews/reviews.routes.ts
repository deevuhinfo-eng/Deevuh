import { Router } from 'express';
import {
  createReview,
  updateReview,
  deleteReview,
  getProductReviews,
  getProductRatingSummary,
  checkPurchaseStatus,
  moderateReview
} from './reviews.controller.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { adminGuard } from '../../middleware/adminGuard.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { createReviewSchema, updateReviewSchema } from './reviews.schemas.js';
import { verifyAccessToken } from '../auth/token.service.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for reviews submission/editing (5 requests per minute)
const reviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    message: 'Too many review actions. Please wait a minute and try again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Optional authentication middleware to populate req.user if present
const optionalAuth = async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    let token = req.cookies?.deevuh_token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    }
  } catch (error) {
    // Ignore error, proceed as unauthenticated
  }
  next();
};

router.post('/', authMiddleware, reviewLimiter, validateRequest(createReviewSchema), createReview);
router.put('/:id', authMiddleware, reviewLimiter, validateRequest(updateReviewSchema), updateReview);
router.delete('/:id', authMiddleware, deleteReview);
router.get('/product/:productId', optionalAuth, getProductReviews);
router.get('/product/:productId/summary', getProductRatingSummary);
router.get('/check-purchase/:productId', authMiddleware, checkPurchaseStatus);
router.patch('/:id/moderate', adminGuard, moderateReview);

export default router;
