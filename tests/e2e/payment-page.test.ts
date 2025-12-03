import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../src/server';
import { signatureService } from '../../src/services/signature.service';

const prisma = new PrismaClient();

describe('Payment Page E2E Tests', () => {
  let merchantToken: string;
  let signatureSecret: string;

  beforeAll(async () => {
    // Create test merchant
    const merchant = await prisma.merchant.create({
      data: {
        merchantToken: 'test-merchant-token-e2e',
        signatureSecret: 'test-signature-secret-e2e',
        name: 'Test Merchant E2E',
        active: true,
      },
    });

    merchantToken = merchant.merchantToken;
    signatureSecret = merchant.signatureSecret;
  });

  afterAll(async () => {
    // Clean up
    await prisma.transaction.deleteMany({
      where: { merchant: { merchantToken } },
    });
    await prisma.merchant.deleteMany({
      where: { merchantToken },
    });
    await prisma.$disconnect();
  });

  describe('POST /app/page/:merchantToken', () => {
    it('should create payment request with valid signature', async () => {
      const paymentData = {
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
      };

      const signature = signatureService.generateSignature(paymentData, signatureSecret);

      const response = await request(app)
        .post(`/app/page/${merchantToken}`)
        .type('form')
        .send({ ...paymentData, sign: signature });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Processing Payment');
    });

    it('should reject payment with invalid signature', async () => {
      const paymentData = {
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
        sign: 'invalid-signature',
      };

      const response = await request(app)
        .post(`/app/page/${merchantToken}`)
        .type('form')
        .send(paymentData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('signature');
    });

    it('should reject payment with invalid merchant token', async () => {
      const paymentData = {
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
      };

      const signature = signatureService.generateSignature(paymentData, signatureSecret);

      const response = await request(app)
        .post('/app/page/invalid-merchant-token')
        .type('form')
        .send({ ...paymentData, sign: signature });

      expect(response.status).toBe(404);
    });

    it('should reject payment with missing required fields', async () => {
      const incompleteData = {
        merchant_reference: `TEST-${Date.now()}`,
        currency: 'HKD',
        amount: '100.00',
        // Missing customer fields
      };

      const signature = signatureService.generateSignature(incompleteData, signatureSecret);

      const response = await request(app)
        .post(`/app/page/${merchantToken}`)
        .type('form')
        .send({ ...incompleteData, sign: signature });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should reject Atome payment below minimum amount', async () => {
      const paymentData = {
        merchant_reference: `TEST-${Date.now()}`,
        currency: 'HKD',
        amount: '25.00', // Below minimum 30.00
        customer_ip: '123.123.123.123',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_phone: '0123123123',
        customer_email: 'test@example.com',
        customer_address: '123 Main St',
        customer_country: 'HK',
        customer_postal_code: '000000',
        network: 'Atome',
        subject: 'Test Payment',
        notify_url: 'https://example.com/notify',
      };

      const signature = signatureService.generateSignature(paymentData, signatureSecret);

      const response = await request(app)
        .post(`/app/page/${merchantToken}`)
        .type('form')
        .send({ ...paymentData, sign: signature });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('minimum amount');
    });

    it('should require address fields for CreditCard', async () => {
      const paymentData = {
        merchant_reference: `TEST-${Date.now()}`,
        currency: 'USD',
        amount: '100.00',
        customer_ip: '123.123.123.123',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_phone: '0123123123',
        customer_email: 'test@example.com',
        network: 'CreditCard',
        subject: 'Test Payment',
        notify_url: 'https://example.com/notify',
        // Missing address fields
      };

      const signature = signatureService.generateSignature(paymentData, signatureSecret);

      const response = await request(app)
        .post(`/app/page/${merchantToken}`)
        .type('form')
        .send({ ...paymentData, sign: signature });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('address');
    });

    it('should accept valid CreditCard payment with address', async () => {
      const paymentData = {
        merchant_reference: `TEST-${Date.now()}`,
        currency: 'USD',
        amount: '100.00',
        customer_ip: '123.123.123.123',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_phone: '0123123123',
        customer_email: 'test@example.com',
        customer_address: '123 Main St',
        customer_state: 'CA',
        customer_country: 'US',
        customer_postal_code: '90210',
        network: 'CreditCard',
        subject: 'Test Payment',
        notify_url: 'https://example.com/notify',
        return_url: 'https://example.com/return',
      };

      const signature = signatureService.generateSignature(paymentData, signatureSecret);

      const response = await request(app)
        .post(`/app/page/${merchantToken}`)
        .type('form')
        .send({ ...paymentData, sign: signature });

      expect(response.status).toBe(200);
    });

    it('should reject non-HKD currency for Alipay', async () => {
      const paymentData = {
        merchant_reference: `TEST-${Date.now()}`,
        currency: 'USD', // Should be HKD for Alipay
        amount: '100.00',
        customer_ip: '123.123.123.123',
        customer_first_name: 'John',
        customer_last_name: 'Doe',
        customer_phone: '0123123123',
        customer_email: 'test@example.com',
        network: 'Alipay',
        subject: 'Test Payment',
        notify_url: 'https://example.com/notify',
      };

      const signature = signatureService.generateSignature(paymentData, signatureSecret);

      const response = await request(app)
        .post(`/app/page/${merchantToken}`)
        .type('form')
        .send({ ...paymentData, sign: signature });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('HKD');
    });
  });
});


