import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import prisma from '../config/database.js';

export interface AuthenticatedRequest extends Request {
  user?: any;
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
    let fullUserData: any = null;

    // Detect if this is the getMe request to combine token check and data fetch
    const isGetMe = req.baseUrl === '/api/auth' && (req.path === '/me' || req.path === '/me/');

    if (decoded.role === 'ADMIN') {
      const admin: any = await prisma.adminUser.findUnique({
        where: { id: decoded.id },
        select: isGetMe 
          ? { tokenVersion: true, id: true, email: true, role: true }
          : { tokenVersion: true }
      });
      if (admin) {
        dbUserTokenVersion = admin.tokenVersion;
        if (isGetMe) {
          fullUserData = { id: admin.id, email: admin.email, role: admin.role };
        }
      }
    } else {
      const user: any = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: isGetMe 
          ? {
              tokenVersion: true,
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
              authProvider: true,
              createdAt: true,
              chest: true,
              waist: true,
              shoulder: true,
              height: true,
              fit: true,
            }
          : { tokenVersion: true }
      });
      if (user) {
        dbUserTokenVersion = user.tokenVersion;
        if (isGetMe) {
          fullUserData = { ...user };
        }
      }
    }

    // If user not found, or tokenVersion is old (was rotated), reject
    if (dbUserTokenVersion === null || dbUserTokenVersion !== decoded.tokenVersion) {
      res.status(401).json({
        status: 'error',
        message: 'Session revoked or invalid.',
      });
      return;
    }

    req.user = isGetMe && fullUserData 
      ? { ...fullUserData, role: decoded.role } 
      : { id: decoded.id, role: decoded.role, email: decoded.email };
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Token expired or invalid.',
    });
  }
};
