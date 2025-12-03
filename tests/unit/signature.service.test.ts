import { SignatureService } from '../../src/services/signature.service';

describe('SignatureService', () => {
  let signatureService: SignatureService;
  const testSecret = '127f7830-b856-4ddf-92b4-a6478e38547b';

  beforeEach(() => {
    signatureService = new SignatureService();
  });

  describe('generateSignature', () => {
    it('should generate correct SHA-512 signature', () => {
      const fields = {
        merchant_reference: '1234567890',
        currency: 'HKD',
        amount: '100.00',
      };

      const signature = signatureService.generateSignature(fields, testSecret);

      expect(signature).toBeDefined();
      expect(signature).toHaveLength(128); // SHA-512 produces 128 hex characters
      expect(signature).toMatch(/^[a-f0-9]{128}$/); // Should be lowercase hex
    });

    it('should sort fields alphabetically before hashing', () => {
      const fields1 = {
        z_field: 'last',
        a_field: 'first',
        m_field: 'middle',
      };

      const fields2 = {
        a_field: 'first',
        m_field: 'middle',
        z_field: 'last',
      };

      const signature1 = signatureService.generateSignature(fields1, testSecret);
      const signature2 = signatureService.generateSignature(fields2, testSecret);

      expect(signature1).toBe(signature2);
    });

    it('should produce different signatures for different secrets', () => {
      const fields = {
        merchant_reference: '1234567890',
        amount: '100.00',
      };

      const signature1 = signatureService.generateSignature(fields, 'secret1');
      const signature2 = signatureService.generateSignature(fields, 'secret2');

      expect(signature1).not.toBe(signature2);
    });

    it('should produce different signatures for different field values', () => {
      const fields1 = { amount: '100.00' };
      const fields2 = { amount: '200.00' };

      const signature1 = signatureService.generateSignature(fields1, testSecret);
      const signature2 = signatureService.generateSignature(fields2, testSecret);

      expect(signature1).not.toBe(signature2);
    });

    it('should handle empty fields object', () => {
      const signature = signatureService.generateSignature({}, testSecret);

      expect(signature).toBeDefined();
      expect(signature).toHaveLength(128);
    });

    it('should match documented example signature', () => {
      // From the PaymentAsia documentation
      const fields = {
        amount: '100.00',
        currency: 'HKD',
        customer_address: '1, Bay Street',
        customer_country: 'US',
        customer_email: 'someone@gmail.com',
        customer_first_name: 'John',
        customer_ip: '123.123.123.123',
        customer_last_name: 'Doe',
        customer_phone: '0123123123',
        customer_postal_code: '10001',
        customer_state: 'NY',
        merchant_reference: '1234567890',
        network: 'Alipay',
        notify_url: 'https://demo.shop.com/payment/notify',
        return_url: 'https://demo.shop.com/payment/return',
        subject: 'IphoneX',
      };

      const signature = signatureService.generateSignature(fields, testSecret);

      // This is the expected signature from the documentation
      expect(signature).toBe(
        'a36026912f25eb4ef4ea23d6f9760fa0e664f7561fa993976b44b3036cd251ab53c6d7401e7b0f2f492867d4d4d59a0abee931bb9040ae8a5b0b0516a7f0923b'
      );
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const fields = {
        merchant_reference: '1234567890',
        currency: 'HKD',
        amount: '100.00',
      };

      const signature = signatureService.generateSignature(fields, testSecret);
      const isValid = signatureService.verifySignature(fields, signature, testSecret);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const fields = {
        merchant_reference: '1234567890',
        amount: '100.00',
      };

      const invalidSignature = 'a'.repeat(128);
      const isValid = signatureService.verifySignature(fields, invalidSignature, testSecret);

      expect(isValid).toBe(false);
    });

    it('should reject signature with modified fields', () => {
      const originalFields = {
        merchant_reference: '1234567890',
        amount: '100.00',
      };

      const signature = signatureService.generateSignature(originalFields, testSecret);

      const modifiedFields = {
        merchant_reference: '1234567890',
        amount: '200.00', // Changed amount
      };

      const isValid = signatureService.verifySignature(modifiedFields, signature, testSecret);

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const fields = {
        merchant_reference: '1234567890',
        amount: '100.00',
      };

      const signature = signatureService.generateSignature(fields, 'secret1');
      const isValid = signatureService.verifySignature(fields, signature, 'secret2');

      expect(isValid).toBe(false);
    });
  });

  describe('sortAndBuildQuery', () => {
    it('should build query string with sorted fields', () => {
      const fields = {
        z_last: 'value3',
        a_first: 'value1',
        m_middle: 'value2',
      };

      const queryString = signatureService.sortAndBuildQuery(fields);

      expect(queryString).toBe('a_first=value1&m_middle=value2&z_last=value3');
    });

    it('should handle URL encoding', () => {
      const fields = {
        email: 'test@example.com',
        subject: 'Test Payment',
      };

      const queryString = signatureService.sortAndBuildQuery(fields);

      expect(queryString).toContain('email=test%40example.com');
      expect(queryString).toContain('subject=Test%20Payment');
    });

    it('should handle empty object', () => {
      const queryString = signatureService.sortAndBuildQuery({});
      expect(queryString).toBe('');
    });
  });
});


