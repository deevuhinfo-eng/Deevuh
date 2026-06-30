import { processPayUWebhook } from '../payments.service.js';
import prisma from '../../../config/database.js';
import { sendOrderEmails } from '../../auth/email.service.js';
import crypto from 'crypto';

jest.mock('../../../config/database.js', () => ({
  __esModule: true,
  default: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productVariant: {
      update: jest.fn(),
    },
    processedWebhook: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}));

jest.mock('../../auth/email.service.js', () => ({
  __esModule: true,
  sendOrderEmails: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
}));

const KEY = 'test_key';
const SALT = 'test_salt';

const generatePayload = (txnid: string, amount: string, status: string) => {
  const payload: any = {
    txnid,
    amount,
    status,
    productinfo: 'Garment SKU 1',
    firstname: 'CustomerName',
    email: 'customer@example.com',
    mihpayid: `mih_${txnid}`,
  };

  const baseSequence = `${status}|||||||||||${payload.email}|${payload.firstname}|${payload.productinfo}|${payload.amount}|${payload.txnid}|${KEY}`;
  const seqWithoutCharges = `${SALT}|${baseSequence}`;
  payload.hash = crypto.createHash('sha512').update(seqWithoutCharges).digest('hex');
  return payload;
};

describe('PayU Webhook Processing Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYU_MERCHANT_KEY = KEY;
    process.env.PAYU_MERCHANT_SALT = SALT;
  });

  it('should successfully process case-insensitive "SUCCESS" status', async () => {
    const payload = generatePayload('txn_1', '1500.00', 'SUCCESS');
    const mockOrder = {
      id: 'order_1',
      finalAmount: 1500.00,
      paymentStatus: 'PENDING',
      orderStatus: 'CREATED',
      items: [
        { productVariantId: 'variant_1', quantity: 2 }
      ],
      shippingName: 'Ayushi Thakur',
      shippingPhone: '7007873572',
      shippingAddress: 'Lucknow',
      user: { email: 'customer@example.com' },
    };

    (prisma.processedWebhook.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.order.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockOrder) // first inside transaction
      .mockResolvedValueOnce(mockOrder); // second for sendOrderEmails mapping

    const result = await processPayUWebhook(payload);

    expect(result).toBe(true);
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { paymentGatewayTxnId: 'txn_1' },
      data: { paymentStatus: 'SUCCESS', orderStatus: 'PROCESSING' },
    });
    expect(sendOrderEmails).toHaveBeenCalled();
  });

  it('should successfully process case-insensitive "success" status', async () => {
    const payload = generatePayload('txn_2', '1500.00', 'success');
    const mockOrder = {
      id: 'order_2',
      finalAmount: 1500.00,
      paymentStatus: 'PENDING',
      orderStatus: 'CREATED',
      items: [
        { productVariantId: 'variant_1', quantity: 2 }
      ],
      shippingName: 'Ayushi Thakur',
      shippingPhone: '7007873572',
      shippingAddress: 'Lucknow',
      user: { email: 'customer@example.com' },
    };

    (prisma.processedWebhook.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.order.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockOrder)
      .mockResolvedValueOnce(mockOrder);

    const result = await processPayUWebhook(payload);

    expect(result).toBe(true);
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { paymentGatewayTxnId: 'txn_2' },
      data: { paymentStatus: 'SUCCESS', orderStatus: 'PROCESSING' },
    });
    expect(sendOrderEmails).toHaveBeenCalled();
  });

  it('should recover orders stuck in CANCELLED state and decrement variant stock quantity', async () => {
    const payload = generatePayload('txn_3', '1500.00', 'SUCCESS');
    const mockOrder = {
      id: 'order_3',
      finalAmount: 1500.00,
      paymentStatus: 'PENDING',
      orderStatus: 'CANCELLED',
      items: [
        { productVariantId: 'variant_1', quantity: 2 },
        { productVariantId: 'variant_2', quantity: 1 }
      ],
      shippingName: 'Ayushi Thakur',
      shippingPhone: '7007873572',
      shippingAddress: 'Lucknow',
      user: { email: 'customer@example.com' },
    };

    (prisma.processedWebhook.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.order.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockOrder)
      .mockResolvedValueOnce(mockOrder);

    const result = await processPayUWebhook(payload);

    expect(result).toBe(true);
    expect(prisma.productVariant.update).toHaveBeenCalledTimes(2);
    expect(prisma.productVariant.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'variant_1' },
      data: { stockQty: { decrement: 2 } },
    });
    expect(prisma.productVariant.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'variant_2' },
      data: { stockQty: { decrement: 1 } },
    });
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { paymentGatewayTxnId: 'txn_3' },
      data: { paymentStatus: 'SUCCESS', orderStatus: 'PROCESSING' },
    });
    expect(sendOrderEmails).toHaveBeenCalled();
  });

  it('should skip processing if webhook was already marked as processed', async () => {
    const payload = generatePayload('txn_4', '1500.00', 'SUCCESS');
    (prisma.processedWebhook.findUnique as jest.Mock).mockResolvedValue({
      webhookId: `mih_txn_4`,
      status: 'success',
    });

    const result = await processPayUWebhook(payload);

    expect(result).toBe(true);
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(sendOrderEmails).not.toHaveBeenCalled();
  });
});
