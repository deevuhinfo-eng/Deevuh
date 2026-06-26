import { runReconciliation } from '../reconciliation.service.js';
import prisma from '../../../config/database.js';

// Mock Prisma
jest.mock('../../../config/database.js', () => ({
  __esModule: true,
  default: {
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    processedWebhook: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}));

describe('Payment Reconciliation Service Tests', () => {
  let mockPendingOrder: any;
  let mockCancelledOrder: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPendingOrder = {
      id: 'order-pending-uuid',
      userId: 'user-id-123',
      shippingName: 'Ayushi Thakur',
      shippingAddress: '3rd floor Hazratganj Lucknow',
      shippingPhone: '7007873572',
      finalAmount: 2699.00,
      paymentGatewayTxnId: 'DEEVUH_d211ee4c68284ea6',
      paymentStatus: 'PENDING',
      orderStatus: 'CREATED',
      items: [
        {
          id: 'item-1',
          productVariantId: 'variant-l',
          quantity: 1,
        }
      ]
    };

    mockCancelledOrder = {
      id: 'order-cancelled-uuid',
      userId: 'user-id-123',
      shippingName: 'Ayushi Thakur',
      shippingAddress: '3rd floor Hazratganj Lucknow',
      shippingPhone: '7007873572',
      finalAmount: 2699.00,
      paymentGatewayTxnId: 'DEEVUH_d211ee4c68284ea6',
      paymentStatus: 'PENDING',
      orderStatus: 'CANCELLED',
      items: [
        {
          id: 'item-1',
          productVariantId: 'variant-l',
          quantity: 1,
        }
      ]
    };

    delete (globalThis as any).mockPayUResponses;
  });

  it('should auto-correct PENDING paid orders to SUCCESS/PROCESSING', async () => {
    (globalThis as any).mockPayUResponses = {
      'DEEVUH_d211ee4c68284ea6': {
        mihpayid: '99999',
        status: 'success',
        amount: '2699.00',
        mode: 'NB',
      }
    };

    (prisma.order.findMany as jest.Mock).mockResolvedValue([mockPendingOrder]);
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockPendingOrder);
    (prisma.processedWebhook.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await runReconciliation();

    expect(result.processed).toBe(1);
    expect(result.corrected).toBe(1);
    expect(result.errors.length).toBe(0);
    expect(result.report[0]).toContain('was PENDING but verified as PAID');

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: mockPendingOrder.id },
      data: {
        paymentStatus: 'SUCCESS',
        orderStatus: 'PROCESSING',
      }
    });
  });

  it('should auto-correct CANCELLED paid orders, mark SUCCESS/PROCESSING, and re-deduct stock', async () => {
    (globalThis as any).mockPayUResponses = {
      'DEEVUH_d211ee4c68284ea6': {
        mihpayid: '99999',
        status: 'success',
        amount: '2699.00',
        mode: 'NB',
      }
    };

    (prisma.order.findMany as jest.Mock).mockResolvedValue([mockCancelledOrder]);
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockCancelledOrder);
    (prisma.processedWebhook.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await runReconciliation();

    expect(result.processed).toBe(1);
    expect(result.corrected).toBe(1);
    expect(result.errors.length).toBe(0);
    expect(result.report[0]).toContain('was CANCELLED but verified as PAID');

    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'variant-l' },
      data: { stockQty: { decrement: 1 } }
    });

    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: mockCancelledOrder.id },
      data: {
        paymentStatus: 'SUCCESS',
        orderStatus: 'PROCESSING',
      }
    });
  });
});
