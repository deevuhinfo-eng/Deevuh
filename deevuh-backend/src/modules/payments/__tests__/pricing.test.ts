import request from 'supertest';
import app from '../../../app.js';
import prisma from '../../../config/database.js';
import { verifyAccessToken } from '../../auth/token.service.js';

jest.mock('../../../config/database.js', () => {
  const client = {
    cart: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    cartItem: {
      create: jest.fn(),
    },
    product: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    productVariant: {
      updateMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
    },
    adminUser: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    coupon: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(client)),
  };
  return {
    __esModule: true,
    default: client,
    prisma: client,
  };
});

jest.mock('../../auth/token.service.js', () => ({
  verifyAccessToken: jest.fn(),
}));

describe('Pricing Pipeline Verification Tests', () => {
  let mockUserPayload: any;
  let mockAdminPayload: any;
  let csrfCookie: string;
  let csrfToken: string;

  const fetchCsrf = async () => {
    const res = await request(app).get('/api/auth/csrf');
    const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
    csrfCookie = cookies.find((c: string) => c.startsWith('XSRF-TOKEN')) || '';
    csrfToken = csrfCookie.split(';')[0].split('=')[1];
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await fetchCsrf();

    mockUserPayload = {
      id: 'customer-123',
      email: 'customer@example.com',
      role: 'USER',
      tokenVersion: 0,
    };

    mockAdminPayload = {
      id: 'admin-999',
      email: 'admin@example.com',
      role: 'ADMIN',
      tokenVersion: 0,
    };

    process.env.PAYU_MERCHANT_KEY = 'test_key';
    process.env.PAYU_MERCHANT_SALT = 'test_salt';
    process.env.BACKEND_URL = 'http://localhost:5000';
  });

  describe('Product Price Update Syncing', () => {
    it('should update associated product variants when basePrice is updated', async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockAdminPayload);
      (prisma.adminUser.findUnique as jest.Mock).mockResolvedValue({ tokenVersion: 0 });
      (prisma.product.update as jest.Mock).mockResolvedValue({ id: 'prod-123' });
      (prisma.productVariant.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'prod-123',
        basePrice: 1.00,
        variants: [{ id: 'var-1', price: 1.00 }],
      });

      const res = await request(app)
        .put('/api/products/prod-123')
        .set('Cookie', [`deevuh_token=valid-admin-token`, csrfCookie])
        .set('x-xsrf-token', csrfToken)
        .send({
          title: 'Sage Linen Coordset',
          basePrice: 1.00,
        });

      expect(res.status).toBe(200);
      expect(prisma.product.update).toHaveBeenCalled();
      expect(prisma.productVariant.updateMany).toHaveBeenCalledWith({
        where: { productId: 'prod-123' },
        data: { price: 1.00 },
      });
    });
  });

  describe('Checkout Recalculation using Product basePrice', () => {
    it('should use Product.basePrice (authoritative) even if ProductVariant.price is stale during checkout', async () => {
      (verifyAccessToken as jest.Mock).mockReturnValue(mockUserPayload);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ tokenVersion: 0 });

      // Stale variant price in the database is 1999.00
      // Authoritative product basePrice is 1.00 (which was recently changed)
      const mockCart = {
        id: 'cart-123',
        userId: 'customer-123',
        status: 'active',
        items: [
          {
            id: 'item-1',
            productVariantId: 'var-1',
            quantity: 2,
            variant: {
              id: 'var-1',
              price: 1999.00, // Stale price
              product: {
                id: 'prod-123',
                basePrice: 1.00, // Authoritative price
              },
            },
          },
        ],
      };

      (prisma.cart.findFirst as jest.Mock).mockResolvedValue(mockCart);
      (prisma.order.create as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({ id: 'order-999', ...data });
      });
      (prisma.cart.update as jest.Mock).mockResolvedValue({ id: 'cart-123', status: 'converted' });

      const res = await request(app)
        .post('/api/checkout/create-order')
        .set('Cookie', [`deevuh_token=valid-user-token`, csrfCookie])
        .set('x-xsrf-token', csrfToken)
        .send({
          shippingName: 'Devanshu',
          shippingPhone: '9999999999',
          shippingAddress: 'Lucknow, Uttar Pradesh, India',
          paymentMethod: 'ONLINE',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');

      // Assert calculations used 2 * 1.00 = 2.00 (authoritative) instead of 2 * 1999 = 3998 (stale)
      const orderCreateCall = (prisma.order.create as jest.Mock).mock.calls[0][0];
      
      // Total amount should be subtotal (2 * 1.00 = 2.00)
      expect(Number(orderCreateCall.data.totalAmount)).toBe(2.00);

      // Order items unitPrice should use basePrice (1.00)
      expect(Number(orderCreateCall.data.items.create[0].unitPrice)).toBe(1.00);
    });
  });
});
