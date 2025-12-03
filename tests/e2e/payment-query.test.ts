import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';
import { signatureService } from '../../src/services/signature.service';

const prisma = new PrismaClient();

describe('Payment Query E2E Tests', () => {
  let merchantToken: string;
  let signatureSecret: string;
  let merchantId: string;

  beforeAll(async () => {
    // Create test merchant
    const merchant = await prisma.merchant.create({
      data: {
        merchantToken: 'test-query-merchant-token',
        signatureSecret: 'test-query-signature-secret',
        name: 'Test Query Merchant',
        active: true,
      },
    });

    merchantToken = merchant.merchantToken;
    signatureSecret = merchant.signatureSecret;
    merchantId = merchant.id;

    // Create test transactions
    await prisma.transaction.createMany({
      data: [
        {
          merchantId,
          merchantReference: 'QUERY-TEST-001',
          currency: 'HKD',
          amount: '100.00',
          network: 'Alipay',
          subject: 'Test Payment 1',
          status: '1', // SUCCESS
          customerIp: '123.123.123.123',
          customerFirstName: 'John',
          customerLastName: 'Doe',
          customerEmail: 'john@example.com',
          customerPhone: '0123123123',
          notifyUrl: 'https://example.com/notify',
          completedTime: new Date(),
        },
        {
          merchantId,
          merchantReference: 'QUERY-TEST-002',
          currency: 'HKD',
          amount: '200.00',
          network: 'Wechat',
          subject: 'Test Payment 2',
          status: '0', // PENDING
          customerIp: '123.123.123.123',
          customerFirstName: 'Jane',
          customerLastName: 'Smith',
          customerEmail: 'jane@example.com',
          customerPhone: '0123123123',
          notifyUrl: 'https://example.com/notify',
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.transaction.deleteMany({
      where: { merchantId },
    });
    await prisma.merchant.deleteMany({
      where: { merchantToken },
    });
    await prisma.$disconnect();
  });

  describe('POST /:merchantToken/payment/query', () => {
    it('should return transaction by merchant reference', async () => {
      const queryData = {
        merchant_reference: 'QUERY-TEST-001',
      };

      const signature = signatureService.generateSignature(queryData, signatureSecret);

      const response = await request(app)
        .post(`/${merchantToken}/payment/query`)
        .type('form')
        .send({ ...queryData, sign: signature });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        type: 'Sale',
        merchant_reference: 'QUERY-TEST-001',
        status: '1',
        currency: 'HKD',
      });
      expect(response.body[0]).toHaveProperty('request_reference');
      expect(response.body[0]).toHaveProperty('created_time');
      expect(response.body[0]).toHaveProperty('completed_time');
    });

    it('should return empty array for non-existent reference', async () => {
      const queryData = {
        merchant_reference: 'NON-EXISTENT',
      };

      const signature = signatureService.generateSignature(queryData, signatureSecret);

      const response = await request(app)
        .post(`/${merchantToken}/payment/query`)
        .type('form')
        .send({ ...queryData, sign: signature });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should reject query with invalid signature', async () => {
      const queryData = {
        merchant_reference: 'QUERY-TEST-001',
        sign: 'invalid-signature',
      };

      const response = await request(app)
        .post(`/${merchantToken}/payment/query`)
        .type('form')
        .send(queryData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('signature');
    });

    it('should reject query with invalid merchant token', async () => {
      const queryData = {
        merchant_reference: 'QUERY-TEST-001',
      };

      const signature = signatureService.generateSignature(queryData, signatureSecret);

      const response = await request(app)
        .post('/invalid-merchant/payment/query')
        .type('form')
        .send({ ...queryData, sign: signature });

      expect(response.status).toBe(404);
    });

    it('should return transaction with correct amount format', async () => {
      const queryData = {
        merchant_reference: 'QUERY-TEST-001',
      };

      const signature = signatureService.generateSignature(queryData, signatureSecret);

      const response = await request(app)
        .post(`/${merchantToken}/payment/query`)
        .type('form')
        .send({ ...queryData, sign: signature });

      expect(response.status).toBe(200);
      expect(response.body[0].amount).toMatch(/^\d+\.\d{6}$/); // Should have 6 decimal places
    });

    it('should return transaction with Unix timestamps', async () => {
      const queryData = {
        merchant_reference: 'QUERY-TEST-001',
      };

      const signature = signatureService.generateSignature(queryData, signatureSecret);

      const response = await request(app)
        .post(`/${merchantToken}/payment/query`)
        .type('form')
        .send({ ...queryData, sign: signature });

      expect(response.status).toBe(200);
      expect(response.body[0].created_time).toMatch(/^\d+$/);
      expect(response.body[0].completed_time).toMatch(/^\d+$/);
    });

    it('should handle pending transaction with null completed_time', async () => {
      const queryData = {
        merchant_reference: 'QUERY-TEST-002',
      };

      const signature = signatureService.generateSignature(queryData, signatureSecret);

      const response = await request(app)
        .post(`/${merchantToken}/payment/query`)
        .type('form')
        .send({ ...queryData, sign: signature });

      expect(response.status).toBe(200);
      expect(response.body[0].status).toBe('0'); // PENDING
      expect(response.body[0].completed_time).toBeNull();
    });
  });
});


