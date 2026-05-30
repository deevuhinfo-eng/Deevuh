import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Generate a random CSRF token
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRF Middleware (Double-Submit Cookie Strategy)
export const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Allow safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exclude external webhooks that use their own signature validation
  const excludedPaths = [
    '/api/payments/webhooks/payu',
    '/api/checkout/webhooks/payu'
  ];
  if (excludedPaths.includes(req.path)) {
    return next();
  }

  // Get token from cookie (non-HttpOnly)
  const cookieToken = req.cookies['XSRF-TOKEN'];
  
  // Get token from custom header
  const headerToken = req.headers['x-xsrf-token'];

  // If either is missing, or they don't match, reject the request
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      status: 'error',
      message: 'CSRF token validation failed.',
    });
    return;
  }

  next();
};
