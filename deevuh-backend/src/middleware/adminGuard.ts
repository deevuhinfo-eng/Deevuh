import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import prisma from '../config/database.js';

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

    // 1. Verify token with Supabase Auth
    const { data: { user: supaUser }, error: supaError } = await supabase.auth.getUser(token);

    if (supaError || !supaUser) {
      res.status(401).json({
        status: 'error',
        message: 'Authorization token expired or invalid.',
      });
      return;
    }

    // 2. Query local database to verify administrative privileges
    const admin = await prisma.adminUser.findUnique({
      where: { id: supaUser.id },
      select: { id: true, email: true, role: true }
    });

    if (!admin) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied: Administrative privileges required.',
      });
      return;
    }

    req.user = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Authorization token expired or invalid.',
    });
  }
};

