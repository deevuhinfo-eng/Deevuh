import { CookieOptions } from 'express';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Common abstraction for JWT cookies
export const getAuthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax', // Best for OAuth and cross-domain redirects while maintaining security
  domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
});

export const getRefreshCookieOptions = (): CookieOptions => ({
  ...getAuthCookieOptions(),
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

export const getAccessCookieOptions = (): CookieOptions => ({
  ...getAuthCookieOptions(),
  maxAge: 15 * 60 * 1000, // 15 minutes
});
