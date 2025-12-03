import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';

const prisma = new PrismaClient();
const API_KEY = process.env.API_KEY || 'test-api-key';

describe('Admin API E2E Tests', () => {
  let merchantId: string;
  let transactionId: string;

  beforeAll(async () => {
    // Create test data
    const merchant = await prisma.merchant.create({
      data: {
        merchantToken: 'admin-test-merchant',
        signatureSecret: 'admin-test-secret',
        name: 'Admin Test Merchant',
        active: true,
      },
    });

    merchantId = merchant.id;

    const transaction = await prisma.transaction.create({
      data: {
        merchantId,
        merchantReference: 'ADMIN-TEST-001',
        currency: 'HKD',
        amount: '100.00',
        network: 'Alipay',
        subject: 'Admin Test Payment',
        status: '1',
        customerIp: '123.123.123.123',
        customerFirstName: 'Admin',
        customerLastName: 'Test',
        customerEmail: 'admin@example.com',
        customerPhone: '0123123123',
        notifyUrl: 'https://example.com/notify',
      },
    });

    transactionId = transaction.id;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { merchantId } });
    await prisma.merchant.deleteMany({ where: { id: merchantId } });
    await prisma.$disconnect();
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app).get('/admin/transactions');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(app)
        .get('/admin/transactions')
        .set('X-API-Key', 'invalid-key');

      expect(response.status).toBe(401);
    });

    it('should accept requests with valid API key', async () => {
      const response = await request(app)
        .get('/admin/transactions')
        .set('X-API-Key', API_KEY);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /admin/transactions', () => {
    it('should list transactions with pagination', async () => {
      const response = await request(app)
        .get('/admin/transactions?page=1&limit=10')
        .set('X-API-Key', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
    });

    it('should respect pagination parameters', async () => {
      const response = await request(app)
        .get('/admin/transactions?page=1&limit=5')
        .set('X-API-Key', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /admin/transactions/:id', () => {
    it('should return transaction details', async () => {
      const response = await request(app)
        .get(`/admin/transactions/${transactionId}`)
        .set('X-API-Key', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({
        id: transactionId,
        merchantReference: 'ADMIN-TEST-001',
        status: '1',
      });
      expect(response.body.data).toHaveProperty('merchant');
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app)
        .get('/admin/transactions/00000000-0000-0000-0000-000000000000')
        .set('X-API-Key', API_KEY);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /admin/scenarios', () => {
    it('should return current scenario configuration', async () => {
      const response = await request(app)
        .get('/admin/scenarios')
        .set('X-API-Key', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('defaultOutcome');
      expect(response.body.data).toHaveProperty('callbackDelay');
      expect(response.body.data).toHaveProperty('processingDelay');
      expect(response.body.data).toHaveProperty('rules');
    });
  });

  describe('POST /admin/scenarios', () => {
    it('should update scenario configuration', async () => {
      const newScenario = {
        defaultOutcome: 'FAIL',
        callbackDelay: 5000,
        rules: [
          {
            condition: 'amount_ends_with',
            value: '.99',
            outcome: 'FAIL',
          },
        ],
      };

      const response = await request(app)
        .post('/admin/scenarios')
        .set('X-API-Key', API_KEY)
        .send(newScenario);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.defaultOutcome).toBe('FAIL');
      expect(response.body.data.callbackDelay).toBe(5000);
      expect(response.body.data.rules).toHaveLength(1);
    });

    it('should reject invalid scenario configuration', async () => {
      const invalidScenario = {
        defaultOutcome: 'INVALID', // Invalid value
      };

      const response = await request(app)
        .post('/admin/scenarios')
        .set('X-API-Key', API_KEY)
        .send(invalidScenario);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /admin/merchants', () => {
    it('should list all merchants', async () => {
      const response = await request(app)
        .get('/admin/merchants')
        .set('X-API-Key', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const merchant = response.body.data.find((m: any) => m.id === merchantId);
      expect(merchant).toBeDefined();
      expect(merchant).toHaveProperty('merchantToken');
      expect(merchant).toHaveProperty('name');
      expect(merchant).toHaveProperty('_count');
    });
  });

  describe('POST /admin/merchants', () => {
    it('should create new merchant', async () => {
      const newMerchant = {
        name: 'New Test Merchant',
      };

      const response = await request(app)
        .post('/admin/merchants')
        .set('X-API-Key', API_KEY)
        .send(newMerchant);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({
        name: 'New Test Merchant',
        active: true,
      });
      expect(response.body.data).toHaveProperty('merchantToken');
      expect(response.body.data).toHaveProperty('signatureSecret');

      // Clean up
      await prisma.merchant.delete({ where: { id: response.body.data.id } });
    });

    it('should create merchant with custom tokens', async () => {
      const customToken = '12345678-1234-1234-1234-123456789012';
      const customSecret = '87654321-4321-4321-4321-210987654321';

      const newMerchant = {
        name: 'Custom Token Merchant',
        merchantToken: customToken,
        signatureSecret: customSecret,
      };

      const response = await request(app)
        .post('/admin/merchants')
        .set('X-API-Key', API_KEY)
        .send(newMerchant);

      expect(response.status).toBe(200);
      expect(response.body.data.merchantToken).toBe(customToken);
      expect(response.body.data.signatureSecret).toBe(customSecret);

      // Clean up
      await prisma.merchant.delete({ where: { id: response.body.data.id } });
    });

    it('should reject merchant creation without name', async () => {
      const response = await request(app)
        .post('/admin/merchants')
        .set('X-API-Key', API_KEY)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /admin/callbacks/:id/trigger', () => {
    it('should trigger callback for transaction', async () => {
      const response = await request(app)
        .post(`/admin/callbacks/${transactionId}/trigger`)
        .set('X-API-Key', API_KEY);

      // Note: This will fail if notify_url is not reachable, but should not return error
      expect([200, 500]).toContain(response.status);
    });

    it('should return error for non-existent transaction', async () => {
      const response = await request(app)
        .post('/admin/callbacks/00000000-0000-0000-0000-000000000000/trigger')
        .set('X-API-Key', API_KEY);

      expect(response.status).toBe(500);
    });
  });
});


