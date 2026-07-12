import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { setAuthCookies, clearAuthCookies, logAuthEvent } from './auth.service.js';
import { supabase, supabaseAdmin } from '../../config/supabase.js';
import { generateVerificationToken, sendVerificationEmail } from './email.service.js';

const SALT_ROUNDS = 12;

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : '';

    // 1. Authenticate with Supabase Auth
    const { data: supaData, error: supaError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (supaError || !supaData.session) {
      await logAuthEvent(null, 'failed_login', req);
      res.status(401).json({ status: 'error', message: supaError?.message || 'Invalid credentials.' });
      return;
    }

    const supaUser = supaData.user;
    const accessToken = supaData.session.access_token;
    const refreshToken = supaData.session.refresh_token;

    // 2. Identify user's role from local DB
    let role = 'USER';
    const admin = await prisma.adminUser.findUnique({ where: { id: supaUser.id } });
    if (admin) {
      role = 'ADMIN';
    } else {
      const customer = await prisma.user.findUnique({ where: { id: supaUser.id } });
      if (!customer) {
        // Safe JIT syncing if user exists in Supabase but not yet in local public schema
        const user_name = supaUser.user_metadata?.name || 'User';
        await prisma.user.create({
          data: {
            id: supaUser.id,
            email: normalizedEmail,
            name: user_name,
            phone: supaUser.phone || '',
            isEmailVerified: supaUser.email_confirmed_at !== null,
          }
        });
      }
    }

    setAuthCookies(res, accessToken, refreshToken);
    await logAuthEvent(supaUser.id, 'login', req);

    res.status(200).json({
      status: 'success',
      data: { user: { id: supaUser.id, email: supaUser.email, role } },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : '';

    // 1. Sign up user in Supabase Auth
    const { data: supaData, error: supaError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { name },
      },
    });

    if (supaError || !supaData.user) {
      res.status(400).json({ status: 'error', message: supaError?.message || 'Registration failed.' });
      return;
    }

    const supaUser = supaData.user;

    // 2. Double check if user already exists in local DB, insert if not
    let user = await prisma.user.findUnique({ where: { id: supaUser.id } });
    if (!user) {
      // Hash password locally as well for backup/co-existence logic
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      user = await prisma.user.create({
        data: {
          id: supaUser.id,
          name,
          email: normalizedEmail,
          password: hashedPassword,
          phone,
        },
      });
    }

    // Send verification mail using the existing email service
    const vToken = await generateVerificationToken(user.email);
    await sendVerificationEmail(user.email, vToken);

    const accessToken = supaData.session?.access_token || '';
    const refreshToken = supaData.session?.refresh_token || '';

    if (accessToken && refreshToken) {
      setAuthCookies(res, accessToken, refreshToken);
    }
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
    await supabase.auth.signOut();
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
    res.status(200).json({ status: 'success', data: req.user });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, phone } = req.body;
    if (!email || !password) {
      res.status(400).json({ status: 'error', message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Password strength check
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[@$!%*?&#.]/.test(password);
    if (password.length < 8 || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      res.status(400).json({
        status: 'error',
        message: 'Password does not meet strength requirements: minimum 8 characters, containing uppercase, lowercase, number, and special character.'
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      res.status(404).json({ status: 'error', message: 'No account found with this email address.' });
      return;
    }

    if (user.phone) {
      if (!phone || phone.trim() !== user.phone.trim()) {
        res.status(400).json({ status: 'error', message: 'Verification details (phone number) do not match.' });
        return;
      }
    }

    // Reset password in Supabase Auth
    const { error: supaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password,
    });

    if (supaError) {
      res.status(400).json({ status: 'error', message: supaError.message });
      return;
    }

    // Reset password in local DB
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        password: hashedPassword,
      }
    });

    res.status(200).json({ status: 'success', message: 'Your password has been successfully reset.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ status: 'error', message: 'Token and password are required.' });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken }
    });

    if (!resetToken) {
      res.status(400).json({ status: 'error', message: 'The password reset link is invalid or has already been used.' });
      return;
    }

    if (resetToken.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
      res.status(400).json({ status: 'error', message: 'The password reset link has expired. Please request a new one.' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { email: resetToken.email }
    });

    if (!user) {
      res.status(400).json({ status: 'error', message: 'User not found.' });
      return;
    }

    // Password strength check
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[@$!%*?&#.]/.test(password);
    if (password.length < 8 || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
      res.status(400).json({
        status: 'error',
        message: 'Password does not meet strength requirements: minimum 8 characters, containing uppercase, lowercase, number, and special character.'
      });
      return;
    }

    // Reset password in Supabase Auth
    const { error: supaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: password,
    });

    if (supaError) {
      res.status(400).json({ status: 'error', message: supaError.message });
      return;
    }

    // Reset locally
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.update({
      where: { email: resetToken.email },
      data: {
        password: hashedPassword,
      }
    });

    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

    res.status(200).json({ status: 'success', message: 'Your password has been successfully reset.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;

    // 1. Authenticate with Google in Supabase
    const { data: supaData, error: supaError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (supaError || !supaData.session) {
      res.status(401).json({ status: 'error', message: supaError?.message || 'Google login failed.' });
      return;
    }

    const supaUser = supaData.user;
    const accessToken = supaData.session.access_token;
    const refreshToken = supaData.session.refresh_token;

    // 2. Find or create user in local DB
    let user = await prisma.user.findUnique({ where: { id: supaUser.id } });

    if (!user) {
      // Check by email to support auto linking
      user = await prisma.user.findUnique({ where: { email: supaUser.email } });
      if (user) {
        // Link the account with the new Supabase ID
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            id: supaUser.id,
            googleId: supaUser.id,
            authProvider: 'GOOGLE',
            avatar: user.avatar || supaUser.user_metadata?.avatar_url,
            isEmailVerified: true
          }
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            id: supaUser.id,
            email: supaUser.email!,
            name: supaUser.user_metadata?.name || 'Google User',
            googleId: supaUser.id,
            authProvider: 'GOOGLE',
            avatar: supaUser.user_metadata?.avatar_url,
            isEmailVerified: true
          }
        });
      }
    }

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

    // Refresh session in Supabase Auth
    const { data: supaData, error: supaError } = await supabase.auth.refreshSession({
      refresh_token: token,
    });

    if (supaError || !supaData.session) {
      throw supaError || new Error('Session refresh failed');
    }

    const newAccessToken = supaData.session.access_token;
    const newRefreshToken = supaData.session.refresh_token;

    setAuthCookies(res, newAccessToken, newRefreshToken);

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

    const user = await prisma.user.findFirst({
      where: { email: verification.email }
    });

    if (!user) {
      res.status(400).json({ status: 'error', message: 'User not found.' });
      return;
    }

    // Update locally
    await prisma.user.update({
      where: { email: verification.email },
      data: { isEmailVerified: true }
    });

    // Confirm in Supabase Auth
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    await prisma.emailVerificationToken.delete({ where: { id: verification.id } });

    res.status(200).json({ status: 'success', message: 'Email verified successfully.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateSizing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Not authenticated.' });
      return;
    }

    const { chest, waist, shoulder, height, fit } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { chest, waist, shoulder, height, fit },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        chest: true,
        waist: true,
        shoulder: true,
        height: true,
        fit: true,
      }
    });

    res.status(200).json({ status: 'success', data: updatedUser });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
