import { sendOrderEmails, type OrderEmailData } from '../../auth/email.service.js';
import { retryFailedEmails } from '../email-retry.service.js';
import prisma from '../../../config/database.js';

// Define shared mocks in the test closure. Note: jest.mock is hoisted,
// so inside the mock factory we will reference a global variable defined on globalThis
// to bypass hoisting temporal dead zone.
const mockSend = jest.fn().mockResolvedValue({ data: { id: 'msg-123' } });
(globalThis as any).mockSendFn = mockSend;

// Mock Prisma
jest.mock('../../../config/database.js', () => ({
  __esModule: true,
  default: {
    emailLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock Resend SDK using a function wrapper that looks up our mock at call-time
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: (...args: any[]) => (globalThis as any).mockSendFn(...args),
      },
    })),
  };
});

describe('Email Service & Retry Automation Tests', () => {
  let mockEmailData: OrderEmailData;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockClear();
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.OWNER_EMAIL = 'owner@deevuh.in';

    mockEmailData = {
      orderId: 'order-123',
      customerName: 'Ayushi Thakur',
      customerEmail: 'ayushi@example.com',
      customerPhone: '7007873572',
      shippingAddress: 'Lucknow, India',
      totalAmount: 2699.00,
      discountAmount: 0,
      gstAmount: 411.71,
      finalAmount: 2699.00,
      paymentGatewayTxnId: 'DEEVUH_txnid123',
      paymentMethod: 'PayU',
      items: [
        {
          productTitle: 'Vatavaran Coordset',
          size: 'L',
          quantity: 1,
          unitPrice: 2699.00,
        },
      ],
    };
  });

  it('should create log entries and send emails on first attempt', async () => {
    // 1. Mock finding no existing logs
    (prisma.emailLog.findUnique as jest.Mock).mockResolvedValue(null);

    // 2. Mock upserting log entry
    (prisma.emailLog.upsert as jest.Mock).mockResolvedValue({
      id: 'log-uuid',
      status: 'PENDING',
      retryCount: 0,
    });

    await sendOrderEmails(mockEmailData);

    // Verify finding unique log for both customer and owner
    expect(prisma.emailLog.findUnique).toHaveBeenCalledTimes(2);

    // Verify upserting log for both customer and owner
    expect(prisma.emailLog.upsert).toHaveBeenCalledTimes(2);

    // Verify Resend's send was called twice
    expect(mockSend).toHaveBeenCalledTimes(2);

    // Verify final status update to SENT
    expect(prisma.emailLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SENT' }),
      })
    );
  });

  it('should skip sending emails if status is already SENT', async () => {
    // Mock existing log with status SENT
    (prisma.emailLog.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-log',
      status: 'SENT',
      sentAt: new Date(),
    });

    await sendOrderEmails(mockEmailData);

    // FindUnique called for both, but returns SENT
    expect(prisma.emailLog.findUnique).toHaveBeenCalledTimes(2);

    // Should skip upsert, resend, and updates
    expect(prisma.emailLog.upsert).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should retry failed email logs within backoff guidelines', async () => {
    const failedLog = {
      id: 'failed-log-id',
      orderId: 'order-123',
      emailType: 'customer_confirmation',
      recipient: 'ayushi@example.com',
      status: 'FAILED',
      retryCount: 0,
      updatedAt: new Date(Date.now() - 40000), // Updated 40 seconds ago (backoff is 30s)
      createdAt: new Date(),
    };

    const mockOrder = {
      id: 'order-123',
      shippingName: 'Ayushi Thakur',
      shippingPhone: '7007873572',
      shippingAddress: 'Lucknow, India',
      totalAmount: 2699.00,
      discountAmount: 0,
      gstAmount: 411.71,
      finalAmount: 2699.00,
      paymentGatewayTxnId: 'DEEVUH_txnid123',
      items: [
        {
          quantity: 1,
          unitPrice: 2699.00,
          variant: {
            size: 'L',
            product: {
              title: 'Vatavaran Coordset',
            },
          },
        },
      ],
      user: {
        email: 'ayushi@example.com',
      },
    };

    (prisma.emailLog.findMany as jest.Mock).mockResolvedValue([failedLog]);
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder);

    const stats = await retryFailedEmails();

    expect(stats.retried).toBe(1);
    expect(stats.succeeded).toBe(1);
    expect(mockSend).toHaveBeenCalledTimes(1);

    expect(prisma.emailLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: failedLog.id },
        data: expect.objectContaining({ status: 'SENT' }),
      })
    );
  });
});
