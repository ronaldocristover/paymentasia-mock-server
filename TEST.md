# Testing Guide

Complete testing documentation for PaymentAsia Mock Server.

## Table of Contents

1. [Test Setup](#test-setup)
2. [Running Tests](#running-tests)
3. [Unit Tests](#unit-tests)
4. [E2E Tests](#e2e-tests)
5. [Test Coverage](#test-coverage)
6. [Writing Tests](#writing-tests)

## Test Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Set up test database
createdb paymentasia_test

# Set test environment variables
cp .env.example .env.test
```

### Test Environment Variables

The test setup automatically configures test environment variables in `tests/setup.ts`:

```env
NODE_ENV=test
DATABASE_URL=postgresql://postgres:password@localhost:5432/paymentasia_test
API_KEY=test-api-key
LOG_LEVEL=error
```

## Running Tests

### All Tests

```bash
npm test
```

### Unit Tests Only

```bash
npm run test:unit
```

### E2E Tests Only

```bash
npm run test:e2e
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Unit Tests

Unit tests focus on individual services and utilities in isolation.

### SignatureService Tests

**Location:** `tests/unit/signature.service.test.ts`

**Coverage:**
- SHA-512 signature generation
- Signature verification
- Field sorting
- Query string building
- Documentation example validation

**Key Test Cases:**
```typescript
// Signature generation
it('should generate correct SHA-512 signature')
it('should sort fields alphabetically before hashing')
it('should match documented example signature')

// Signature verification
it('should verify valid signature')
it('should reject invalid signature')
it('should reject signature with modified fields')
```

### ScenarioService Tests

**Location:** `tests/unit/scenario.service.test.ts`

**Coverage:**
- Payment outcome determination
- Scenario rule matching
- Configuration management
- Rule conditions (amount_ends_with, network, etc.)

**Key Test Cases:**
```typescript
// Outcome determination
it('should return SUCCESS when default outcome is SUCCESS')
it('should return FAIL when default outcome is FAIL')
it('should return random outcome when set to RANDOM')

// Rule matching
it('should match amount_ends_with rule')
it('should match amount_equals rule')
it('should match network rule')
```

### PaymentService Tests

**Location:** `tests/unit/payment.service.test.ts`

**Coverage:**
- Transaction creation
- Status updates
- Transaction queries
- Data formatting

**Key Test Cases:**
```typescript
// Transaction management
it('should create a new transaction')
it('should generate unique request references')
it('should update transaction status')

// Data retrieval
it('should return transactions for merchant reference')
it('should format amount with 6 decimal places')
```

## E2E Tests

E2E tests validate complete API workflows using Supertest.

### Payment Page E2E Tests

**Location:** `tests/e2e/payment-page.test.ts`

**Coverage:**
- Complete payment request flow
- Signature validation
- Merchant validation
- Field validation
- Network-specific requirements

**Key Test Cases:**
```typescript
// Valid requests
it('should create payment request with valid signature')
it('should accept valid CreditCard payment with address')

// Validation
it('should reject payment with invalid signature')
it('should reject payment with invalid merchant token')
it('should reject payment with missing required fields')

// Network-specific
it('should reject Atome payment below minimum amount')
it('should require address fields for CreditCard')
it('should reject non-HKD currency for Alipay')
```

### Payment Query E2E Tests

**Location:** `tests/e2e/payment-query.test.ts`

**Coverage:**
- Transaction query by merchant reference
- Data formatting (amounts, timestamps)
- Empty results handling

**Key Test Cases:**
```typescript
// Query operations
it('should return transaction by merchant reference')
it('should return empty array for non-existent reference')

// Data format
it('should return transaction with correct amount format')
it('should return transaction with Unix timestamps')
it('should handle pending transaction with null completed_time')
```

### Admin API E2E Tests

**Location:** `tests/e2e/admin.test.ts`

**Coverage:**
- API key authentication
- Transaction management
- Scenario configuration
- Merchant management
- Callback triggering

**Key Test Cases:**
```typescript
// Authentication
it('should reject requests without API key')
it('should accept requests with valid API key')

// Transaction management
it('should list transactions with pagination')
it('should return transaction details')

// Scenario configuration
it('should update scenario configuration')
it('should reject invalid scenario configuration')

// Merchant management
it('should create new merchant')
it('should list all merchants')
```

## Test Coverage

### Current Coverage Targets

- **Overall:** 80%+
- **Services:** 90%+
- **Routes:** 85%+
- **Middleware:** 85%+

### View Coverage Report

```bash
npm run test:coverage
```

Then open `coverage/lcov-report/index.html` in your browser.

### Coverage by Component

| Component | Target | Notes |
|-----------|--------|-------|
| SignatureService | 95%+ | Critical for security |
| PaymentService | 90%+ | Core business logic |
| ScenarioService | 90%+ | Testing infrastructure |
| CallbackService | 85%+ | External dependencies |
| Routes | 85%+ | Integration points |
| Middleware | 85%+ | Request validation |

## Writing Tests

### Test Structure

```typescript
describe('ComponentName', () => {
  // Setup
  beforeAll(async () => {
    // One-time setup
  });

  beforeEach(() => {
    // Per-test setup
  });

  // Test suites
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = method(input);

      // Assert
      expect(result).toBe('expected');
    });
  });

  // Cleanup
  afterEach(() => {
    // Per-test cleanup
  });

  afterAll(async () => {
    // One-time cleanup
  });
});
```

### Best Practices

#### 1. Test Naming

✅ Good:
```typescript
it('should reject payment with invalid signature')
it('should return empty array for non-existent reference')
it('should format amount with 6 decimal places')
```

❌ Bad:
```typescript
it('test payment')
it('works correctly')
it('validation')
```

#### 2. Arrange-Act-Assert Pattern

```typescript
it('should generate correct signature', () => {
  // Arrange: Set up test data
  const fields = { amount: '100.00', currency: 'HKD' };
  const secret = 'test-secret';

  // Act: Execute the code under test
  const signature = signatureService.generateSignature(fields, secret);

  // Assert: Verify the results
  expect(signature).toBeDefined();
  expect(signature).toHaveLength(128);
});
```

#### 3. Test Independence

Each test should be independent and not rely on other tests:

```typescript
// ✅ Good: Each test creates its own data
it('should create transaction', async () => {
  const data = createTestPaymentData();
  const tx = await paymentService.createTransaction(data, merchantId);
  expect(tx).toBeDefined();
  await cleanup(tx.id);
});

// ❌ Bad: Tests depend on each other
let transactionId;
it('should create transaction', async () => {
  const tx = await createTransaction();
  transactionId = tx.id; // Don't do this
});
it('should update transaction', async () => {
  await updateTransaction(transactionId); // Depends on previous test
});
```

#### 4. Database Cleanup

Always clean up test data:

```typescript
describe('PaymentService', () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    // Clean up after each test
    await prisma.transaction.deleteMany({
      where: { id: { in: createdIds } }
    });
    createdIds.length = 0;
  });

  it('should create transaction', async () => {
    const tx = await paymentService.createTransaction(data, merchantId);
    createdIds.push(tx.id); // Track for cleanup
    expect(tx).toBeDefined();
  });
});
```

#### 5. Mock External Dependencies

```typescript
// Mock axios for callback tests
jest.mock('axios');

it('should send callback', async () => {
  const mockPost = jest.spyOn(axios, 'post').mockResolvedValue({
    status: 200,
    data: {}
  });

  await callbackService.sendCallback(transaction);

  expect(mockPost).toHaveBeenCalledWith(
    transaction.notifyUrl,
    expect.any(String),
    expect.any(Object)
  );
});
```

### Test Data Helpers

Create reusable test data generators:

```typescript
// tests/helpers/test-data.ts
export function createTestPaymentData(overrides = {}) {
  return {
    merchant_reference: `TEST-${Date.now()}`,
    currency: 'HKD',
    amount: '100.00',
    customer_ip: '123.123.123.123',
    customer_first_name: 'Test',
    customer_last_name: 'User',
    customer_phone: '0123123123',
    customer_email: 'test@example.com',
    network: 'Alipay',
    subject: 'Test Payment',
    notify_url: 'https://example.com/notify',
    sign: 'dummy-signature',
    ...overrides
  };
}
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: paymentasia_test
          POSTGRES_PASSWORD: password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npx prisma migrate deploy

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Problem:** Tests fail with "database connection refused"

**Solution:**
```bash
# Ensure PostgreSQL is running
docker-compose up -d db

# Create test database
createdb paymentasia_test

# Check DATABASE_URL in tests/setup.ts
```

#### 2. Port Already in Use

**Problem:** E2E tests fail because server port is in use

**Solution:**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change test port in tests/setup.ts
process.env.PORT = '3001';
```

#### 3. Test Timeouts

**Problem:** Tests timeout waiting for async operations

**Solution:**
```typescript
// Increase timeout for specific tests
it('should complete long operation', async () => {
  // test code
}, 15000); // 15 second timeout

// Or in jest.config.js
testTimeout: 10000
```

#### 4. Flaky Tests

**Problem:** Tests pass sometimes and fail other times

**Solution:**
- Ensure test independence
- Add proper cleanup
- Use deterministic test data
- Avoid race conditions with proper awaits

```typescript
// ❌ Bad: Race condition
it('should process callback', async () => {
  callbackService.scheduleCallback(txId, 1000);
  // Test continues immediately
  const tx = await getTransaction(txId);
  expect(tx.callbackSent).toBe(true); // May fail
});

// ✅ Good: Wait for callback
it('should process callback', async () => {
  await callbackService.scheduleCallback(txId, 0);
  await sleep(100); // Give it time to complete
  const tx = await getTransaction(txId);
  expect(tx.callbackSent).toBe(true);
});
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

## Contributing Tests

When contributing new features:

1. Write tests first (TDD approach)
2. Ensure >80% coverage for new code
3. Include both unit and E2E tests
4. Update this documentation
5. Run full test suite before committing

```bash
npm run test:coverage
# Ensure coverage meets targets
```


