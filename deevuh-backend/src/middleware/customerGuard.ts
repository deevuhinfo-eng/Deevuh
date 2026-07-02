import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware.js';

export const customerGuard = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'USER') {
    res.status(403).json({
      status: 'error',
      message: 'Access denied: Customer privileges required.',
    });
    return;
  }
  next();
};
