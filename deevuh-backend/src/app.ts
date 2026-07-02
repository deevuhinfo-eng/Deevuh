import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import prisma from './config/database.js';
import { Prisma } from '@prisma/client';

import authRoutes from './modules/auth/auth.routes.js';
import productRoutes from './modules/products/products.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import orderRoutes from './modules/orders/orders.routes.js';
import couponRoutes from './modules/coupons/coupons.routes.js';
import paymentRoutes from './modules/payments/payments.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import uploadRoutes from './modules/uploads/uploads.routes.js';
import reviewsRoutes from './modules/reviews/reviews.routes.js';
import wishlistRoutes from './modules/wishlist/wishlist.routes.js';

import { correlationMiddleware } from './middleware/correlation.js';

dotenv.config();

const app = express();

app.use(correlationMiddleware);

// Trust reverse proxy for secure cookies and rate limits
app.set('trust proxy', 1);

// Security middleware with strict CSP and production-only HSTS
app.use(helmet({
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com"],
      connectSrc: ["'self'", "https://accounts.google.com", "*.googleapis.com"],
      imgSrc: ["'self'", "data:", "*.cloudinary.com"],
      frameAncestors: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    const isVercelPreview = origin && origin.endsWith('.vercel.app') && origin.includes('deevuh');
    const isLocalDev = process.env.NODE_ENV !== 'production' && origin && origin.endsWith('.vercel.app');
    if (!origin || allowedOrigins.includes(origin) || isLocalDev || isVercelPreview) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting — 300 requests per 15 minutes (scaled for active storefront users)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Body & Cookie parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import { csrfMiddleware } from './middleware/csrf.js';
app.use(csrfMiddleware);

// Health check — redacts DB connection URL entirely and verifies DB connectivity
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[Health Check DB Connection Error]', error.message);
    res.status(500).json({ status: 'error', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/checkout', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Error]', err);

  let statusCode = err.status || 500;
  let clientMessage = err.message;

  const isPrismaError =
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientValidationError ||
    (err.message && err.message.toLowerCase().includes('prisma'));

  if (isPrismaError) {
    statusCode = 500;
    clientMessage = 'Something went wrong.';
  } else if (process.env.NODE_ENV === 'production') {
    clientMessage = 'An unexpected error occurred.';
  }

  res.status(statusCode).json({
    status: 'error',
    message: clientMessage,
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found.' });
});

export default app;
