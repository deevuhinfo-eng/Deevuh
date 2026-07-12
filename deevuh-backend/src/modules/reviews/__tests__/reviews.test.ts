import request from 'supertest';
import app from '../../../app.js';
import prisma from '../../../config/database.js';
import { supabase } from '../../../config/supabase.js';

// Mock Prisma Client
jest.mock('../../../config/database.js', () => {
  const mockPrisma: any = {
    review: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
    },
    adminUser: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };
  mockPrisma.$transaction = jest.fn((cb) => cb(mockPrisma));
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

// Mock Supabase Config
jest.mock('../../../config/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('Reviews Module Integration Tests', () => {
  const mockUserId = 'user-uuid-1234';
  const mockAdminId = 'admin-uuid-5678';
  const mockToken = 'mock-supabase-jwt-token';
  const csrfToken = 'mock-csrf-token-12345';
  const csrfCookie = `XSRF-TOKEN=${csrfToken}; SameSite=Lax; Path=/`;
  const mockProductId = '6f8d9b15-998e-4a6c-9227-2ad5e8841fb2';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/reviews', () => {
    it('should reject requests without a token cookie', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null }, error: new Error('Missing token') });

      const res = await request(app)
        .post('/api/reviews')
        .send({ productId: mockProductId, rating: 5, reviewText: 'Amazing quality! Highly recommend.' });

      expect(res.status).toBe(403); // Fails CSRF first if headers missing, but if we pass CSRF it returns 401
    });

    it('should reject unauthenticated review submission with invalid cookie', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') });

      const res = await request(app)
        .post('/api/reviews')
        .set('Cookie', [`deevuh_token=invalid-jwt`, csrfCookie])
        .set('x-xsrf-token', csrfToken)
        .send({ productId: mockProductId, rating: 5, reviewText: 'Amazing quality! Highly recommend.' });

      expect(res.status).toBe(401);
    });

    it('should submit review when customer is authenticated and verified purchaser', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId, email: 'customer@deevuh.com' } },
        error: null,
      });
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: mockUserId });
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: mockProductId });
      (prisma.review.findFirst as jest.Mock).mockResolvedValue(null);
      
      // Verified purchase mock
      (prisma.order.findFirst as jest.Mock).mockResolvedValue({
        id: 'order-1',
        paymentStatus: 'SUCCESS',
      });

      // Review creation mock
      (prisma.review.create as jest.Mock).mockResolvedValue({
        id: 'rev-123',
        userId: mockUserId,
        productId: mockProductId,
        rating: 5,
        reviewText: 'Amazing quality! Highly recommend.',
        isVerifiedPurchase: true,
      });
      (prisma.review.findUnique as jest.Mock).mockResolvedValue({
        id: 'rev-123',
        userId: mockUserId,
        productId: mockProductId,
        rating: 5,
        reviewText: 'Amazing quality! Highly recommend.',
        isVerifiedPurchase: true,
        user: { name: 'Test User' },
        images: [],
      });

      const res = await request(app)
        .post('/api/reviews')
        .set('Cookie', [`deevuh_token=${mockToken}`, csrfCookie])
        .set('x-xsrf-token', csrfToken)
        .send({ productId: mockProductId, rating: 5, reviewText: 'Amazing quality! Highly recommend.' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.isVerifiedPurchase).toBe(true);
    });
  });

  describe('PATCH /api/reviews/:id/moderate (Admin Restriction)', () => {
    const mockReviewId = 'rev-123';

    it('should reject moderation requests from non-admins', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId, email: 'customer@deevuh.com' } },
        error: null,
      });
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .patch(`/api/reviews/${mockReviewId}/moderate`)
        .set('Cookie', [`deevuh_token=${mockToken}`, csrfCookie])
        .set('x-xsrf-token', csrfToken)
        .send({ isHidden: true });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied: Administrative privileges required');
    });

    it('should allow review moderation from verified admins', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockAdminId, email: 'admin@deevuh.com' } },
        error: null,
      });
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue({
        id: mockAdminId,
        email: 'admin@deevuh.com',
        role: 'ADMIN',
      });
      (prisma.review.update as jest.Mock).mockResolvedValue({
        id: mockReviewId,
        isHidden: true,
      });

      const res = await request(app)
        .patch(`/api/reviews/${mockReviewId}/moderate`)
        .set('Cookie', [`deevuh_token=${mockToken}`, csrfCookie])
        .set('x-xsrf-token', csrfToken)
        .send({ isHidden: true });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });
});
