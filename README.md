# PaymentAsia Mock Server

A comprehensive mock server implementation for the PaymentAsia payment gateway API, built with TypeScript, Express, and Prisma ORM. This server simulates the complete payment flow including hosted payment pages, callbacks, and transaction queries.

## Features

- **Full API Implementation**
  - Hosted Payment Page (HPP) endpoint
  - Payment Query API
  - Admin API for management and testing

- **Payment Methods Support**
  - Alipay
  - WeChat Pay
  - China UnionPay (CUP)
  - Credit Card
  - Atome (Buy Now Pay Later)

- **Security Features**
  - SHA-512 signature verification
  - Helmet.js security headers
  - Rate limiting
  - CORS configuration
  - API key authentication for admin endpoints
  - Input validation with Zod

- **Realistic Payment Simulation**
  - Configurable payment outcomes (SUCCESS/FAIL/RANDOM)
  - Delayed callbacks with retry logic
  - Status transitions (PENDING → PROCESSING → SUCCESS/FAIL)
  - Scenario-based testing rules

- **Developer Experience**
  - TypeScript for type safety
  - Prisma ORM for database operations
  - Bruno API documentation
  - Docker support
  - Comprehensive logging with Winston

## Quick Start with Docker

The fastest way to get started:

```bash
# Clone the repository
cd paymentasia-mock-server

# Start services with Docker Compose
docker-compose up -d

# The server will be available at http://localhost:3000
```

The database will be automatically migrated and seeded with a default merchant.

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- (Optional) Bruno for API testing

### Installation

1. **Install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/paymentasia_mock
API_KEY=your-admin-api-key-here
```

3. **Set up the database:**

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed the database
npm run seed
```

4. **Start the development server:**

```bash
npm run dev
```

The server will start at `http://localhost:3000`.

## API Documentation

### Default Merchant Credentials

```
Merchant Token: ae476881-7bfc-4da8-bc7d-8203ad0fb28c
Signature Secret: 127f7830-b856-4ddf-92b4-a6478e38547b
```

### Hosted Payment Page

**Endpoint:** `POST /app/page/:merchantToken`

Create a payment request:

```bash
curl -X POST http://localhost:3000/app/page/ae476881-7bfc-4da8-bc7d-8203ad0fb28c \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "merchant_reference=TEST-123" \
  -d "currency=HKD" \
  -d "amount=100.00" \
  -d "customer_ip=123.123.123.123" \
  -d "customer_first_name=John" \
  -d "customer_last_name=Doe" \
  -d "customer_phone=0123123123" \
  -d "customer_email=test@example.com" \
  -d "network=Alipay" \
  -d "subject=Test Payment" \
  -d "notify_url=https://webhook.site/your-id" \
  -d "return_url=https://example.com/return" \
  -d "sign=<generated_signature>"
```

### Payment Query

**Endpoint:** `POST /:merchantToken/payment/query`

Query transaction status:

```bash
curl -X POST http://localhost:3000/ae476881-7bfc-4da8-bc7d-8203ad0fb28c/payment/query \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "merchant_reference=TEST-123" \
  -d "sign=<generated_signature>"
```

### Admin Endpoints

All admin endpoints require the `X-API-Key` header.

- `GET /admin/transactions` - List all transactions
- `GET /admin/transactions/:id` - Get transaction details
- `POST /admin/scenarios` - Configure payment outcomes
- `GET /admin/scenarios` - Get current scenario configuration
- `POST /admin/callbacks/:id/trigger` - Manually trigger callback
- `GET /admin/merchants` - List all merchants
- `POST /admin/merchants` - Create new merchant

Example:

```bash
curl http://localhost:3000/admin/transactions \
  -H "X-API-Key: your-admin-api-key-here"
```

## Configuration

### Payment Scenarios

Configure how the mock server handles payment outcomes:

```bash
curl -X POST http://localhost:3000/admin/scenarios \
  -H "X-API-Key: your-admin-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "defaultOutcome": "SUCCESS",
    "callbackDelay": 3000,
    "processingDelay": 1000,
    "rules": [
      {
        "condition": "amount_ends_with",
        "value": ".99",
        "outcome": "FAIL"
      }
    ]
  }'
```

### Scenario Rules

- **defaultOutcome**: `SUCCESS`, `FAIL`, or `RANDOM`
- **callbackDelay**: Delay in milliseconds before sending callback (default: 3000)
- **processingDelay**: Delay before moving to PROCESSING status (default: 1000)
- **rules**: Conditional rules for specific outcomes

Rule conditions:
- `amount_ends_with`: Match amount ending (e.g., ".99" for testing failures)
- `amount_equals`: Exact amount match
- `network`: Match specific payment network

## Testing

### Generate Signatures

Use the signature generator utility:

```bash
npx ts-node scripts/generate-signature.ts
```

### End-to-End Test

Run the complete payment flow test:

```bash
npx ts-node scripts/test-payment-flow.ts
```

### Bruno API Collection

Open the `api-doc` folder in Bruno to access the complete API collection with:
- Pre-configured environments (local, docker)
- Example requests for all payment methods
- Auto-generated signatures in pre-request scripts
- Response validation tests

## Database Management

### Prisma Studio

Open Prisma Studio to view and edit data:

```bash
npm run prisma:studio
```

### Migrations

Create a new migration:

```bash
npx prisma migrate dev --name your_migration_name
```

### Reset Database

```bash
npx prisma migrate reset
```

## Docker Deployment

### Build and Run

```bash
# Build the image
docker build -t paymentasia-mock-server .

# Run with Docker Compose
docker-compose up -d
```

### Environment Variables in Docker

Edit `docker-compose.yml` or create a `.env` file:

```env
API_KEY=your-secure-api-key
DEFAULT_PAYMENT_OUTCOME=SUCCESS
CALLBACK_DELAY_MS=3000
```

### Health Check

The Docker container includes a health check endpoint:

```bash
curl http://localhost:3000/health
```

## Security Considerations

### Production Deployment

1. **Change default credentials:**
   - Generate new merchant tokens (UUIDs)
   - Generate new signature secrets
   - Change the admin API key

2. **Environment variables:**
   - Never commit `.env` files
   - Use secure secrets management
   - Rotate keys regularly

3. **Network security:**
   - Use HTTPS in production
   - Configure CORS properly
   - Whitelist IPs if possible
   - Set appropriate rate limits

4. **Database:**
   - Use strong PostgreSQL passwords
   - Enable SSL connections
   - Regular backups

### Rate Limiting

Configure rate limits in `.env`:

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100   # Max requests per window
```

## Project Structure

```
/src
  /config          - Configuration files
  /middleware      - Express middleware
  /routes          - API route handlers
  /services        - Business logic
  /types           - TypeScript type definitions
  /utils           - Utility functions
/prisma
  schema.prisma    - Database schema
  seed.ts          - Database seeding
  /migrations      - Database migrations
/api-doc           - Bruno API documentation
/scripts           - Utility scripts
server.ts          - Application entry point
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs db

# Recreate database
docker-compose down -v
docker-compose up -d
```

### Port Already in Use

Change the port in `.env` or `docker-compose.yml`:

```env
PORT=3001
```

### Signature Verification Fails

1. Ensure fields are sorted alphabetically
2. Use exact values (no extra spaces)
3. Use the correct secret key
4. Verify SHA-512 algorithm

Use the signature generator script to debug:

```bash
npx ts-node scripts/generate-signature.ts
```

## API Response Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid input or signature
- `401 Unauthorized` - Missing or invalid API key
- `403 Forbidden` - Merchant inactive
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Transaction Status Codes

- `0` - PENDING: Transaction awaiting payment
- `1` - SUCCESS: Payment completed successfully
- `2` - FAIL: Payment failed or rejected
- `4` - PROCESSING: Payment being processed

## Payment Network Requirements

### All Networks
- merchant_reference, currency, amount
- customer details (name, email, phone, ip)
- network, subject, notify_url
- sign (SHA-512 signature)

### Credit Card & Atome Additional Requirements
- customer_address (required)
- customer_country (required)
- customer_postal_code (required)
- customer_state (required for US/Canada)

### Atome Specific
- Minimum amount: 30.00 HKD
- Only supports HKD currency

## Contributing

This is a mock server for testing purposes. Feel free to extend functionality as needed for your testing scenarios.

## License

MIT

## Support

For issues or questions, please check:
1. The Bruno API documentation in `api-doc/`
2. Example scripts in `scripts/`
3. The original PaymentAsia API documentation

## Changelog

### Version 1.0.0
- Initial release
- Full API implementation
- Docker support
- Bruno API documentation
- Configurable payment scenarios
- Admin endpoints

