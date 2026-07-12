import request from 'supertest';
import app from '../../../app.js';
import prisma from '../../../config/database.js';
import { supabase } from '../../../config/supabase.js';

// Mock Prisma
jest.mock('../../../config/database.js', () => ({
  __esModule: true,
  default: {
    cart: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    cartItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
    },
    adminUser: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((cmds) => Promise.all(cmds)),
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

describe('Cart Module Integration Tests', () => {
  const mockUserId = 'user-uuid-1234';
  const mockToken = 'mock-supabase-jwt-token';
  const csrfToken = 'mock-csrf-token-12345';
  const csrfCookie = `XSRF-TOKEN=${csrfToken}; SameSite=Lax; Path=/`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/cart', () => {
    it('should reject requests without a token cookie', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null }, error: new Error('Missing token') });

      const res = await request(app).get('/api/cart');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Authentication required');
    });

    it('should reject requests with an invalid token cookie', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null }, error: new Error('Invalid token') });

      const res = await request(app)
        .get('/api/cart')
        .set('Cookie', ['deevuh_token=invalid-jwt']);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Token expired or invalid');
    });

    it('should retrieve the cart for authenticated customers', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: mockUserId, email: 'customer@deevuh.com' } },
        error: null,
      });
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: mockUserId });
      (prisma.cart.findFirst as jest.Mock).mockResolvedValue({
        id: 'cart-123',
        userId: mockUserId,
        status: 'active',
        items: [],
      });

      const res = await request(app)
        .get('/api/cart')
        .set('Cookie', [`deevuh_token=${mockToken}`]);

      console.log('[Test Debug] GET /api/cart response status:', res.status);
      console.log('[Test Debug] GET /api/cart response body:', res.body);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe('cart-123');
    });
  });

  describe('POST /api/cart/add', () => {
    const mockVariantId = '6f8d9b15-998e-4a6c-9227-2ad5e8841fb2'; // valid UUID format

    it('should reject requests without a CSRF token', async () => {
      const res = await request(app)
        .post('/api/cart/add')
        .send({ productVariantId: mockVariantId, quantity: 1 });
      
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('CSRF token validation failed');
    });

    it('should successfully add a valid variant to cart', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: mockUserId, email: 'customer@deevuh.com' } },
        error: null,
      });
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: mockUserId });
      
      // Mock variant and active cart checks
      (prisma.productVariant.findUnique as jest.Mock).mockResolvedValueOnce({
        id: mockVariantId,
        stockQty: 10,
      });
      (prisma.cart.findFirst as jest.Mock).mockResolvedValueOnce({
        id: 'cart-123',
        userId: mockUserId,
      });
      (prisma.cartItem.findFirst as jest.Mock).mockResolvedValueOnce(null); // no duplicate

      // Mock the final findUnique retrieval
      (prisma.cart.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'cart-123',
        items: [
          {
            id: 'item-999',
            productVariantId: mockVariantId,
            quantity: 2,
          }
        ]
      });

      const res = await request(app)
        .post('/api/cart/add')
        .set('Cookie', [`deevuh_token=${mockToken}`, csrfCookie])
        .set('x-xsrf-token', csrfToken)
        .send({ productVariantId: mockVariantId, quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.items[0].quantity).toBe(2);
    });
  });
});
