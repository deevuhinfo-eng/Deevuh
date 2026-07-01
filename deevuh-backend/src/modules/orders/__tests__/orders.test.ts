import request from 'supertest';
import app from '../../../app.js';
import prisma from '../../../config/database.js';
import { verifyAccessToken } from '../../auth/token.service.js';

jest.mock('../../../config/database.js', () => {
  const client = {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    productVariant: {
      update: jest.fn(),
    },
    adminUser: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(client)),
  };
  return {
    __esModule: true,
    default: client,
    prisma: client,
  };
});

// Mock Token Service
jest.mock('../../auth/token.service.js', () => ({
  verifyAccessToken: jest.fn(),
}));

describe('Order Lifecycle, State Transitions & IDOR Tests', () => {
  let mockOrder: any;
  let mockUserPayload: any;
  let mockAdminPayload: any;
  let csrfCookie: string;
  let csrfToken: string;

  // Helper to fetch CSRF
  const fetchCsrf = async () => {
    const res = await request(app).get('/api/auth/csrf');
    const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
    csrfCookie = cookies.find((c: string) => c.startsWith('XSRF-TOKEN')) || '';
    csrfToken = csrfCookie.split(';')[0].split('=')[1];
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await fetchCsrf();
    
    mockOrder = {
      id: '74efdfeb-ce6f-47d7-8b9d-d843e922758a',
      userId: 'user-id-123',
      shippingName: 'Ayushi Thakur',
      shippingAddress: '3rd floor Hazratganj Lucknow',
      shippingPhone: '7007873572',
      totalAmount: 2699.00,
      discountAmount: 0.00,
      gstAmount: 411.71,
      finalAmount: 2699.00,
      paymentGatewayTxnId: 'DEEVUH_d211ee4c68284ea6',
      paymentStatus: 'PENDING',
      orderStatus: 'CREATED',
    };

    mockUserPayload = {
      id: 'user-id-123',
      email: 'user@deevuh.com',
      role: 'USER',
      tokenVersion: 0,
    };

    mockAdminPayload = {
      id: 'admin-id-999',
      email: 'admin@deevuh.com',
      role: 'ADMIN',
      tokenVersion: 0,
    };
  });

  describe('Order Ownership (IDOR Protection)', () => {
    it('should allow retrieving the order details if the user is the owner', async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockUserPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ tokenVersion: 0 });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      const res = await request(app)
        .get(`/api/orders/${mockOrder.id}`)
        .set('Cookie', 'deevuh_token=valid-user-token');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.id).toBe(mockOrder.id);
    });

    it('should reject retrieving the order details (404) if it belongs to another user', async () => {
      const foreignUserPayload = {
        id: 'foreign-user-id',
        email: 'attacker@deevuh.com',
        role: 'USER',
        tokenVersion: 0,
      };

      (verifyAccessToken as jest.Mock).mockReturnValue(foreignUserPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ tokenVersion: 0 });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

      const res = await request(app)
        .get(`/api/orders/${mockOrder.id}`)
        .set('Cookie', 'deevuh_token=attacker-token');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Order not found');
    });
  });

  describe('Order State Machine validation (PUT /api/orders/status)', () => {
    it('should allow valid transition CREATED -> CANCELLED', async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockAdminPayload);
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue({ tokenVersion: 0 });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);
      (prisma.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const res = await request(app)
        .put('/api/orders/status')
        .set('Cookie', [`deevuh_token=admin-token`, csrfCookie])
        .set('x-xsrf-token', csrfToken)
        .send({ orderId: mockOrder.id, orderStatus: 'CANCELLED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should reject invalid transition DELIVERED -> CREATED', async () => {
      const deliveredOrder = { ...mockOrder, orderStatus: 'DELIVERED' };

      (verifyAccessToken as jest.Mock).mockReturnValue(mockAdminPayload);
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue({ tokenVersion: 0 });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(deliveredOrder);

      const res = await request(app)
        .put('/api/orders/status')
        .set('Cookie', [`deevuh_token=admin-token`, csrfCookie])
        .set('x-xsrf-token', csrfToken)
        .send({ orderId: mockOrder.id, orderStatus: 'CREATED' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid transition');
    });
  });
});
