import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import prisma from '../config/database.js';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string; email: string };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Read token from cookie first, fallback to Authorization header
    let token = req.cookies?.deevuh_token;
    
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required.',
      });
      return;
    }

    const decoded = verifyAccessToken(token);

    // Strict validation: check tokenVersion against the database depending on role
    let dbUserTokenVersion: number | null = null;
    if (decoded.role === 'ADMIN') {
      const admin = await prisma.adminUser.findUnique({
        where: { id: decoded.id },
        select: { tokenVersion: true }
      });
      if (admin) dbUserTokenVersion = admin.tokenVersion;
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { tokenVersion: true }
      });
      if (user) dbUserTokenVersion = user.tokenVersion;
    }

    // If user not found, or tokenVersion is old (was rotated), reject
    if (dbUserTokenVersion === null || dbUserTokenVersion !== decoded.tokenVersion) {
      res.status(401).json({
        status: 'error',
        message: 'Session revoked or invalid.',
      });
      return;
    }

    req.user = { id: decoded.id, role: decoded.role, email: decoded.email };
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Token expired or invalid.',
    });
  }
};
