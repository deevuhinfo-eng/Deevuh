import { Router } from 'express';
import {
  login,
  register,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  googleLogin,
  refreshTokens,
  verifyEmail,
  updateSizing,
} from './auth.controller.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { generateCsrfToken } from '../../middleware/csrf.js';
import { getAuthCookieOptions } from '../../utils/cookies.js';

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

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per 15 minutes
  message: { status: 'error', message: 'Too many password reset attempts. Please try again after 15 minutes.' },
});

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#.]/, 'Password must contain at least one special character'),
  phone: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#.]/, 'Password must contain at least one special character'),
  phone: z.string().optional(),
});

const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Token is required' }),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#.]/, 'Password must contain at least one special character'),
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
router.put('/sizing', authMiddleware, updateSizing);
router.post('/forgot-password', forgotPasswordLimiter, validateRequest(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validateRequest(resetPasswordSchema), resetPassword);

router.get('/csrf', (req, res) => {
  const token = generateCsrfToken();
  const options = getAuthCookieOptions(req);
  res.cookie('XSRF-TOKEN', token, {
    ...options,
    httpOnly: false, // Must be readable by frontend JS
  });
  res.status(200).json({ status: 'success', message: 'CSRF token set.' });
});

export default router;
