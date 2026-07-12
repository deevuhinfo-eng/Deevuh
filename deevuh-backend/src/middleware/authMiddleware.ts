import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database.js';
import { supabase } from '../config/supabase.js';

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

    console.log('[Debug AuthMiddleware] token:', token);
    console.log('[Debug AuthMiddleware] supabase.auth.getUser is:', supabase.auth.getUser);
    
    // 1. Verify token with Supabase Auth
    const { data: { user: supaUser }, error: supaError } = await supabase.auth.getUser(token);
    
    console.log('[Debug AuthMiddleware] supaUser:', supaUser, 'supaError:', supaError);
    
    if (supaError || !supaUser) {
      res.status(401).json({
        status: 'error',
        message: 'Token expired or invalid.',
      });
      return;
    }

    // Detect if this is the getMe request to combine token check and data fetch
    const isGetMe = req.baseUrl === '/api/auth' && (req.path === '/me' || req.path === '/me/');

    // 2. Query local database to identify role and fetch details
    let role = 'USER';
    let fullUserData: any = null;

    console.log('[Debug AuthMiddleware] querying adminUser...');
    const admin: any = await prisma.adminUser.findUnique({
      where: { id: supaUser.id },
      select: isGetMe 
        ? { id: true, email: true, role: true }
        : { id: true }
    });
    console.log('[Debug AuthMiddleware] admin result:', admin);

    if (admin) {
      role = 'ADMIN';
      if (isGetMe) {
        fullUserData = { id: admin.id, email: admin.email, role: admin.role };
      }
    } else {
      // Otherwise find customer details
      console.log('[Debug AuthMiddleware] querying customer...');
      const customer: any = await prisma.user.findUnique({
        where: { id: supaUser.id },
        select: isGetMe 
          ? {
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
          : { id: true }
      });
      console.log('[Debug AuthMiddleware] customer result:', customer);

      if (!customer) {
        res.status(401).json({
          status: 'error',
          message: 'User profile not found in local database.',
        });
        return;
      }

      if (isGetMe) {
        fullUserData = { ...customer };
      }
    }

    req.user = isGetMe && fullUserData 
      ? { ...fullUserData, role } 
      : { id: supaUser.id, role, email: supaUser.email };
      
    next();
  } catch (error) {
    console.error('[Debug AuthMiddleware] caught error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Token expired or invalid.',
    });
  }
};

