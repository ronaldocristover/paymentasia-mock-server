import { PrismaClient } from '@prisma/client';
import { PaymentService } from '../../src/services/payment.service';
import { PaymentRequest } from '../../src/types/payment.types';

const prisma = new PrismaClient();

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let testMerchantId: string;

  beforeAll(async () => {
    paymentService = new PaymentService();

    // Create test merchant
    const merchant = await prisma.merchant.create({
      data: {
        merchantToken: 'payment-service-test-merchant',
        signatureSecret: 'payment-service-test-secret',
        name: 'Payment Service Test',
        active: true,
      },
    });

    testMerchantId = merchant.id;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { merchantId: testMerchantId } });
    await prisma.merchant.delete({ where: { id: testMerchantId } });
    await prisma.$disconnect();
  });

  describe('createTransaction', () => {
    it('should create a new transaction', async () => {
      const paymentData: PaymentRequest = {
        merchant_reference: `TEST-${Date.now()}`,
        currency: 'HKD',
        amount: '100.00',
        customer_ip: '123.123.123.123',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_phone: '0123123123',
        customer_email: 'test@example.com',
        network: 'Alipay',
        subject: 'Test Payment',
        notify_url: 'https://example.com/notify',
        return_url: 'https://example.com/return',
        sign: 'dummy-signature',
      };

      const transaction = await paymentService.createTransaction(paymentData, testMerchantId);

      expect(transaction).toBeDefined();
      expect(transaction.merchantReference).toBe(paymentData.merchant_reference);
      expect(transaction.currency).toBe(paymentData.currency);
      expect(transaction.amount.toString()).toBe(paymentData.amount);
      expect(transaction.status).toBe('0'); // PENDING
      expect(transaction.type).toBe('Sale');
      expect(transaction.requestReference).toBeDefined();

      // Clean up
      await prisma.transaction.delete({ where: { id: transaction.id } });
    });

    it('should generate unique request references', async () => {
      const paymentData: PaymentRequest = {
        merchant_reference: `TEST-${Date.now()}`,
        currency: 'HKD',
        amount: '100.00',
        customer_ip: '123.123.123.123',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_phone: '0123123123',
        customer_email: 'test@example.com',
        network: 'Alipay',
        subject: 'Test Payment',
        notify_url: 'https://example.com/notify',
        sign: 'dummy-signature',
      };

      const tx1 = await paymentService.createTransaction(paymentData, testMerchantId);
      const tx2 = await paymentService.createTransaction(paymentData, testMerchantId);

      expect(tx1.requestReference).not.toBe(tx2.requestReference);

      // Clean up
      await prisma.transaction.deleteMany({
        where: { id: { in: [tx1.id, tx2.id] } },
      });
    });
  });

  describe('updateTransactionStatus', () => {
    it('should update transaction status', async () => {
      // Create a transaction first
      const paymentData: PaymentRequest = {
        merchant_reference: `TEST-${Date.now()}`,
        currency: 'HKD',
        amount: '100.00',
        customer_ip: '123.123.123.123',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_phone: '0123123123',
        customer_email: 'test@example.com',
        network: 'Alipay',
        subject: 'Test Payment',
        notify_url: 'https://example.com/notify',
        sign: 'dummy-signature',
      };

      const transaction = await paymentService.createTransaction(paymentData, testMerchantId);

      // Update status
      const updated = await paymentService.updateTransactionStatus(
        transaction.requestReference,
        '1' // SUCCESS
      );

      expect(updated.status).toBe('1');
      expect(updated.completedTime).toBeDefined();

      // Clean up
      await prisma.transaction.delete({ where: { id: transaction.id } });
    });

    it('should set completedTime for final statuses', async () => {
      const paymentData: PaymentRequest = {
        merchant_reference: `TEST-${Date.now()}`,
        currency: 'HKD',
        amount: '100.00',
        customer_ip: '123.123.123.123',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_phone: '0123123123',
        customer_email: 'test@example.com',
        network: 'Alipay',
        subject: 'Test Payment',
        notify_url: 'https://example.com/notify',
        sign: 'dummy-signature',
      };

      const transaction = await paymentService.createTransaction(paymentData, testMerchantId);

      const updated = await paymentService.updateTransactionStatus(
        transaction.requestReference,
        '2' // FAIL
      );

      expect(updated.completedTime).toBeDefined();

      // Clean up
      await prisma.transaction.delete({ where: { id: transaction.id } });
    });
  });

  describe('getTransactionsByMerchantReference', () => {
    it('should return transactions for merchant reference', async () => {
      const merchantRef = `TEST-MULTI-${Date.now()}`;

      // Create multiple transactions with same merchant reference
      const tx1 = await prisma.transaction.create({
        data: {
          merchantId: testMerchantId,
          merchantReference: merchantRef,
          currency: 'HKD',
          amount: '100.00',
          network: 'Alipay',
          subject: 'Test 1',
          status: '1',
          customerIp: '123.123.123.123',
          customerFirstName: 'John',
          customerLastName: 'Doe',
          customerEmail: 'test@example.com',
          customerPhone: '0123123123',
          notifyUrl: 'https://example.com/notify',
          completedTime: new Date(),
        },
      });

      const transactions = await paymentService.getTransactionsByMerchantReference(merchantRef);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].merchant_reference).toBe(merchantRef);
      expect(transactions[0].type).toBe('Sale');
      expect(transactions[0]).toHaveProperty('created_time');
      expect(transactions[0]).toHaveProperty('completed_time');

      // Clean up
      await prisma.transaction.delete({ where: { id: tx1.id } });
    });

    it('should return empty array for non-existent reference', async () => {
      const transactions = await paymentService.getTransactionsByMerchantReference(
        'NON-EXISTENT-REF'
      );

      expect(transactions).toHaveLength(0);
    });

    it('should format amount with 6 decimal places', async () => {
      const merchantRef = `TEST-AMOUNT-${Date.now()}`;

      const tx = await prisma.transaction.create({
        data: {
          merchantId: testMerchantId,
          merchantReference: merchantRef,
          currency: 'HKD',
          amount: '100.50',
          network: 'Alipay',
          subject: 'Test',
          status: '1',
          customerIp: '123.123.123.123',
          customerFirstName: 'John',
          customerLastName: 'Doe',
          customerEmail: 'test@example.com',
          customerPhone: '0123123123',
          notifyUrl: 'https://example.com/notify',
        },
      });

      const transactions = await paymentService.getTransactionsByMerchantReference(merchantRef);

      expect(transactions[0].amount).toMatch(/^\d+\.\d{6}$/);

      // Clean up
      await prisma.transaction.delete({ where: { id: tx.id } });
    });
  });
});


