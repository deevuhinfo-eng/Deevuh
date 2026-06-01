import { CookieOptions } from 'express';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Common abstraction for JWT cookies
export const getAuthCookieOptions = (req?: any): CookieOptions => {
  const options: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax', // Best for OAuth and cross-domain redirects while maintaining security
  };

  if (isProduction && process.env.COOKIE_DOMAIN) {
    const domain = process.env.COOKIE_DOMAIN;
    if (req) {
      const host = req.headers['x-forwarded-host'] || req.headers.host || '';
      const cleanDomain = domain.startsWith('.') ? domain.slice(1) : domain;
      if (host === cleanDomain || host.endsWith('.' + cleanDomain)) {
        options.domain = domain;
      }
    } else {
      options.domain = domain;
    }
  }

  return options;
};

export const getRefreshCookieOptions = (req?: any): CookieOptions => ({
  ...getAuthCookieOptions(req),
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

export const getAccessCookieOptions = (req?: any): CookieOptions => ({
  ...getAuthCookieOptions(req),
  maxAge: 15 * 60 * 1000, // 15 minutes
});
