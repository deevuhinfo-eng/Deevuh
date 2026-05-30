import { Router } from 'express';
import {
  login,
  register,
  logout,
  getMe,
  resetPassword,
  googleLogin,
  refreshTokens,
  verifyEmail,
} from './auth.controller.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { generateCsrfToken } from '../../middleware/csrf.js';

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests per windowMs
  message: { status: 'error', message: 'Too many requests, please try again later.' },
});

const googleLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { status: 'error', message: 'Too many requests, please try again later.' },
});

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const googleLoginSchema = z.object({
  idToken: z.string({ required_error: 'Google ID token is required' }),
});

router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.post('/register', authLimiter, validateRequest(registerSchema), register);
router.post('/google', googleLimiter, validateRequest(googleLoginSchema), googleLogin);
router.post('/refresh', refreshTokens);
router.get('/verify-email', authLimiter, verifyEmail);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), resetPassword);

router.get('/csrf', (req, res) => {
  const token = generateCsrfToken();
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Must be readable by frontend JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
  });
  res.status(200).json({ status: 'success', message: 'CSRF token set.' });
});

export default router;
