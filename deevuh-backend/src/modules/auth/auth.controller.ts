import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from './token.service.js';
import { setAuthCookies, clearAuthCookies, logAuthEvent } from './auth.service.js';
import { getAccessCookieOptions } from '../../utils/cookies.js';
import { verifyGoogleToken } from './google.service.js';
import { generateVerificationToken, sendVerificationEmail } from './email.service.js';

const SALT_ROUNDS = 12;

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Check admin_users first
    const adminUser = await prisma.adminUser.findUnique({ where: { email } });
    if (adminUser) {
      const isValid = await bcrypt.compare(password, adminUser.passwordHash);
      if (!isValid) {
        await logAuthEvent(adminUser.id, 'failed_login', req);
        res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
        return;
      }
      
      const payload = { id: adminUser.id, email: adminUser.email, role: adminUser.role, tokenVersion: adminUser.tokenVersion };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);
      
      setAuthCookies(res, accessToken, refreshToken);
      await logAuthEvent(adminUser.id, 'login', req);

      res.status(200).json({
        status: 'success',
        data: { user: payload },
      });
      return;
    }

    // Check regular users
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      await logAuthEvent(user?.id || null, 'failed_login', req);
      res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      await logAuthEvent(user.id, 'failed_login', req);
      res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
      return;
    }

    const payload = { id: user.id, email: user.email, role: 'USER', tokenVersion: user.tokenVersion };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    setAuthCookies(res, accessToken, refreshToken);
    await logAuthEvent(user.id, 'login', req);

    res.status(200).json({
      status: 'success',
      data: { user: { id: user.id, email: user.email, name: user.name, role: 'USER' } },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ status: 'error', message: 'Email already registered.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone },
    });

    const vToken = await generateVerificationToken(user.email);
    await sendVerificationEmail(user.email, vToken);

    const payload = { id: user.id, email: user.email, role: 'USER', tokenVersion: user.tokenVersion };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    setAuthCookies(res, accessToken, refreshToken);
    await logAuthEvent(user.id, 'register', req);

    res.status(201).json({
      status: 'success',
      data: { user: { id: user.id, email: user.email, name: user.name, role: 'USER' } },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      // Increment token version to invalidate refresh tokens
      if (req.user.role === 'ADMIN') {
        await prisma.adminUser.update({
          where: { id: req.user.id },
          data: { tokenVersion: { increment: 1 } }
        });
      } else {
        await prisma.user.update({
          where: { id: req.user.id },
          data: { tokenVersion: { increment: 1 } }
        });
      }
    }
    
    await logAuthEvent(req.user?.id || null, 'logout', req as Request);
    clearAuthCookies(res);
    res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Not authenticated.' });
      return;
    }

    if (req.user.role === 'ADMIN') {
      const admin = await prisma.adminUser.findUnique({ where: { id: req.user.id } });
      res.status(200).json({
        status: 'success',
        data: { id: admin?.id, email: admin?.email, role: admin?.role },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, phone: true, avatar: true, authProvider: true, createdAt: true },
    });
    res.status(200).json({ status: 'success', data: user });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  // Disabling insecure reset password for now.
  res.status(403).json({ status: 'error', message: 'Endpoint disabled for security reasons.' });
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;
    const payload = await verifyGoogleToken(idToken);
    
    // Find user by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: payload.sub },
          { email: payload.email }
        ]
      }
    });

    if (user) {
      // Safe linking: Only link if Google says verified and our DB says verified (or we trust Google implicitly if the user signed up via local but never verified). Wait, the plan said:
      // "Only auto-link if both Google's payload and the DB's isEmailVerified are true. Otherwise, throw an error requiring password confirmation to link."
      // Let's implement strict linking:
      if (!user.googleId) {
        if (user.isEmailVerified && payload.email_verified) {
          // Link it automatically
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: payload.sub, authProvider: 'GOOGLE', avatar: user.avatar || payload.picture }
          });
        } else {
          res.status(401).json({ status: 'error', message: 'Email address already registered. Please log in with your password to link your Google account.' });
          return;
        }
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: payload.email!,
          name: payload.name || 'Google User',
          googleId: payload.sub,
          authProvider: 'GOOGLE',
          avatar: payload.picture,
          isEmailVerified: true // From Google
        }
      });
    }

    const tokenPayload = { id: user.id, email: user.email, role: 'USER', tokenVersion: user.tokenVersion };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    
    setAuthCookies(res, accessToken, refreshToken);
    await logAuthEvent(user.id, 'google_login', req);

    res.status(200).json({
      status: 'success',
      data: { user: { id: user.id, email: user.email, name: user.name, role: 'USER', avatar: user.avatar } },
    });
  } catch (error: any) {
    res.status(401).json({ status: 'error', message: error.message });
  }
};

export const refreshTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.deevuh_refresh_token;
    if (!token) {
      res.status(401).json({ status: 'error', message: 'No refresh token provided.' });
      return;
    }

    const decoded = verifyRefreshToken(token);

    // Verify tokenVersion
    let tokenVersion: number;
    if (decoded.role === 'ADMIN') {
      const admin = await prisma.adminUser.findUnique({ where: { id: decoded.id }, select: { tokenVersion: true } });
      if (!admin || admin.tokenVersion !== decoded.tokenVersion) throw new Error('Session revoked');
      tokenVersion = admin.tokenVersion;
    } else {
      const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { tokenVersion: true } });
      if (!user || user.tokenVersion !== decoded.tokenVersion) throw new Error('Session revoked');
      tokenVersion = user.tokenVersion;
    }

    const payload = { id: decoded.id, email: decoded.email, role: decoded.role, tokenVersion };
    const newAccessToken = generateAccessToken(payload);
    
    // We only need to set the new access token
    res.cookie('deevuh_token', newAccessToken, getAccessCookieOptions());

    res.status(200).json({ status: 'success', message: 'Token refreshed.' });
  } catch (error: any) {
    await logAuthEvent(null, 'refresh_failed', req);
    clearAuthCookies(res);
    res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token.' });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ status: 'error', message: 'Invalid token.' });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const verification = await prisma.emailVerificationToken.findUnique({
      where: { token: hashedToken }
    });

    if (!verification) {
      res.status(400).json({ status: 'error', message: 'Invalid or expired token.' });
      return;
    }

    if (verification.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { id: verification.id } });
      res.status(400).json({ status: 'error', message: 'Token has expired.' });
      return;
    }

    await prisma.user.update({
      where: { email: verification.email },
      data: { isEmailVerified: true }
    });

    await prisma.emailVerificationToken.delete({ where: { id: verification.id } });

    res.status(200).json({ status: 'success', message: 'Email verified successfully.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
