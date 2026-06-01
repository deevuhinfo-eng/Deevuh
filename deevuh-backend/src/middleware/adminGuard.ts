import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import { prisma } from '../config/database.js';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; email: string };
}

export const adminGuard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.deevuh_token;
    
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication token missing.',
      });
      return;
    }

    const decoded = verifyAccessToken(token);

    if (decoded.role !== 'ADMIN') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied: Administrative privileges required.',
      });
      return;
    }

    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.id },
      select: { tokenVersion: true }
    });

    if (!admin || admin.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({
        status: 'error',
        message: 'Session revoked or invalid.',
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Authorization token expired or invalid.',
    });
  }
};
