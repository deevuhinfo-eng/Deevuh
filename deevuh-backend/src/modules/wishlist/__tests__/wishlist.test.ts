import request from 'supertest';
import app from '../../../app.js';
import prisma from '../../../config/database.js';
import { supabase } from '../../../config/supabase.js';

// Mock Prisma
jest.mock('../../../config/database.js', () => ({
  __esModule: true,
  default: {
    wishlistItem: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
    adminUser: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock Supabase Config
jest.mock('../../../config/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('Wishlist Module Integration Tests', () => {
  const mockUserId = 'user-uuid-1234';
  const mockToken = 'mock-supabase-jwt-token';
  const csrfToken = 'mock-csrf-token-12345';
  const csrfCookie = `XSRF-TOKEN=${csrfToken}; SameSite=Lax; Path=/`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/wishlist', () => {
    it('should reject requests without a token cookie', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null }, error: new Error('Missing token') });

      const res = await request(app).get('/api/wishlist');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Authentication required');
    });

    it('should reject requests with an invalid token cookie', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') });

      const res = await request(app)
        .get('/api/wishlist')
        .set('Cookie', ['deevuh_token=invalid-jwt']);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Token expired or invalid');
    });

    it('should retrieve wishlist items for authenticated customers', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId, email: 'customer@deevuh.com' } },
        error: null,
      });
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: mockUserId });
      (prisma.wishlistItem.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'wish-123',
          product: {
            id: 'prod-123',
            title: 'Royal Sherwani',
            basePrice: 15000,
            category: 'Couture',
            description: 'Handcrafted premium designer piece',
            images: [{ imageUrl: 'https://res.cloudinary.com/image1.jpg' }],
            variants: [{ size: 'M' }],
          },
        },
      ]);

      const res = await request(app)
        .get('/api/wishlist')
        .set('Cookie', [`deevuh_token=${mockToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data[0].title).toBe('Royal Sherwani');
    });
  });

  describe('POST /api/wishlist/:productId', () => {
    const mockProductId = 'prod-123';

    it('should add a product to wishlist if authenticated and CSRF matches', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId, email: 'customer@deevuh.com' } },
        error: null,
      });
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: mockUserId });
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ id: mockProductId });
      (prisma.wishlistItem.upsert as jest.Mock).mockResolvedValue({
        id: 'wish-123',
        userId: mockUserId,
        productId: mockProductId,
      });

      const res = await request(app)
        .post(`/api/wishlist/${mockProductId}`)
        .set('Cookie', [`deevuh_token=${mockToken}`, csrfCookie])
        .set('x-xsrf-token', csrfToken);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('Added to wishlist');
    });
  });
});
