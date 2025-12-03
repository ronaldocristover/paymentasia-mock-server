// Test setup and global mocks
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/paymentasia_test';
process.env.API_KEY = 'test-api-key';
process.env.DEFAULT_MERCHANT_TOKEN = 'test-merchant-token';
process.env.DEFAULT_SIGNATURE_SECRET = 'test-signature-secret';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests


