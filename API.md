# API Documentation

Complete API reference for PaymentAsia Mock Server.

## Base URL

- Local: `http://localhost:3000`
- Docker: `http://localhost:3000`

## Authentication

### Merchant Authentication
All payment endpoints require a valid `merchantToken` in the URL and a valid `sign` (signature) in the request body.

### Admin Authentication
Admin endpoints require an `X-API-Key` header:

```
X-API-Key: your-admin-api-key-here
```

## Signature Generation

All requests must include a SHA-512 signature.

### Algorithm

1. Collect all request fields (excluding `sign`)
2. Sort fields alphabetically by key name
3. Build query string: `key1=value1&key2=value2`
4. Append secret key to the end
5. Generate SHA-512 hash

### Example (Node.js)

```javascript
const crypto = require('crypto');
const querystring = require('querystring');

function generateSignature(fields, secret) {
  // Sort alphabetically
  const sorted = Object.keys(fields).sort().reduce((acc, key) => {
    acc[key] = fields[key];
    return acc;
  }, {});
  
  // Build query string
  const queryString = querystring.stringify(sorted);
  
  // Append secret and hash
  const signatureString = queryString + secret;
  return crypto.createHash('sha512').update(signatureString).digest('hex');
}
```

## Endpoints

### 1. Health Check

Check if the server is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. Hosted Payment Page

Initiate a payment request.

**Endpoint:** `POST /app/page/:merchantToken`

**Content-Type:** `application/x-www-form-urlencoded`

**Required Fields:**

| Field | Type | Description |
|-------|------|-------------|
| merchant_reference | string(36) | Your unique transaction reference |
| currency | string(3) | HKD/USD for Credit Card, HKD only for others |
| amount | string | Format: XX.XX (e.g., 100.00) |
| customer_ip | string(15) | Customer IPv4 address |
| customer_first_name | string(255) | Customer first name |
| customer_last_name | string(255) | Customer last name |
| customer_phone | string(64) | Customer phone number |
| customer_email | string(255) | Customer email address |
| network | string | Alipay, Wechat, CUP, CreditCard, Atome |
| subject | string(255) | Payment description |
| notify_url | string(255) | Callback URL for payment notification |
| sign | string(128) | SHA-512 signature |

**Optional Fields:**

| Field | Type | Description |
|-------|------|-------------|
| return_url | string(255) | Redirect URL after payment |
| customer_address | string | Required for CreditCard & Atome |
| customer_state | string(2) | Required for CreditCard & Atome (US/CA) |
| customer_country | string(2) | Required for CreditCard & Atome |
| customer_postal_code | string(64) | Required for CreditCard & Atome |

**Example Request:**

```bash
curl -X POST http://localhost:3000/app/page/ae476881-7bfc-4da8-bc7d-8203ad0fb28c \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "merchant_reference=TEST-123456" \
  -d "currency=HKD" \
  -d "amount=100.00" \
  -d "customer_ip=123.123.123.123" \
  -d "customer_first_name=John" \
  -d "customer_last_name=Doe" \
  -d "customer_phone=0123123123" \
  -d "customer_email=john@example.com" \
  -d "network=Alipay" \
  -d "subject=Test Payment" \
  -d "notify_url=https://webhook.site/your-id" \
  -d "return_url=https://example.com/return" \
  -d "sign=abc123..."
```

**Response:**

Returns HTML page that redirects to `return_url` or JSON response:

```json
{
  "success": true,
  "request_reference": "uuid-here",
  "merchant_reference": "TEST-123456",
  "status": "0"
}
```

**Callback to notify_url:**

After payment processing, a POST request is sent to `notify_url`:

```
merchant_reference=TEST-123456
request_reference=uuid-here
currency=HKD
amount=100.00
status=1
sign=abc123...
```

---

### 3. Payment Query

Query transaction status by merchant reference.

**Endpoint:** `POST /:merchantToken/payment/query`

**Content-Type:** `application/x-www-form-urlencoded`

**Required Fields:**

| Field | Type | Description |
|-------|------|-------------|
| merchant_reference | string(36) | Your transaction reference |
| sign | string(128) | SHA-512 signature |

**Example Request:**

```bash
curl -X POST http://localhost:3000/ae476881-7bfc-4da8-bc7d-8203ad0fb28c/payment/query \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "merchant_reference=TEST-123456" \
  -d "sign=abc123..."
```

**Response:**

Returns JSON array (empty if no transactions found):

```json
[
  {
    "type": "Sale",
    "merchant_reference": "TEST-123456",
    "request_reference": "uuid-here",
    "status": "1",
    "currency": "HKD",
    "amount": "100.000000",
    "created_time": "1640000000",
    "completed_time": "1640000300"
  }
]
```

**Status Codes:**
- `0` = PENDING
- `1` = SUCCESS
- `2` = FAIL
- `4` = PROCESSING

---

## Admin Endpoints

All admin endpoints require `X-API-Key` header.

### 4. List Transactions

Get all transactions with pagination.

**Endpoint:** `GET /admin/transactions?page=1&limit=20`

**Headers:**
```
X-API-Key: your-admin-api-key
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "merchantReference": "TEST-123",
      "requestReference": "uuid",
      "status": "1",
      "currency": "HKD",
      "amount": "100.000000",
      "network": "Alipay",
      "merchant": {
        "name": "Test Merchant",
        "merchantToken": "uuid"
      },
      "createdTime": "2024-01-01T00:00:00.000Z",
      "completedTime": "2024-01-01T00:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### 5. Get Transaction

Get transaction details by ID.

**Endpoint:** `GET /admin/transactions/:id`

**Headers:**
```
X-API-Key: your-admin-api-key
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "merchantReference": "TEST-123",
    "requestReference": "uuid",
    "status": "1",
    "currency": "HKD",
    "amount": "100.000000",
    "network": "Alipay",
    "subject": "Test Payment",
    "customerEmail": "test@example.com",
    "customerFirstName": "John",
    "customerLastName": "Doe",
    "callbackSent": true,
    "callbackAttempts": 1,
    "merchant": {
      "name": "Test Merchant",
      "merchantToken": "uuid"
    }
  }
}
```

---

### 6. Configure Scenario

Configure payment outcome behavior.

**Endpoint:** `POST /admin/scenarios`

**Headers:**
```
X-API-Key: your-admin-api-key
Content-Type: application/json
```

**Request Body:**

```json
{
  "defaultOutcome": "SUCCESS",
  "callbackDelay": 3000,
  "processingDelay": 1000,
  "rules": [
    {
      "condition": "amount_ends_with",
      "value": ".99",
      "outcome": "FAIL"
    },
    {
      "condition": "network",
      "value": "CreditCard",
      "outcome": "SUCCESS"
    }
  ]
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| defaultOutcome | string | SUCCESS, FAIL, or RANDOM |
| callbackDelay | number | Delay in ms before callback (default: 3000) |
| processingDelay | number | Delay in ms before PROCESSING status (default: 1000) |
| rules | array | Array of conditional rules |

**Rule Conditions:**
- `amount_ends_with`: Match amount ending
- `amount_equals`: Exact amount match
- `network`: Match payment network

**Response:**

```json
{
  "success": true,
  "message": "Scenario configuration updated",
  "data": {
    "defaultOutcome": "SUCCESS",
    "callbackDelay": 3000,
    "processingDelay": 1000,
    "rules": [...]
  }
}
```

---

### 7. Get Scenarios

Get current scenario configuration.

**Endpoint:** `GET /admin/scenarios`

**Headers:**
```
X-API-Key: your-admin-api-key
```

**Response:**

```json
{
  "success": true,
  "data": {
    "defaultOutcome": "SUCCESS",
    "callbackDelay": 3000,
    "processingDelay": 1000,
    "rules": []
  }
}
```

---

### 8. Trigger Callback

Manually trigger a callback for a transaction.

**Endpoint:** `POST /admin/callbacks/:id/trigger`

**Headers:**
```
X-API-Key: your-admin-api-key
```

**Response:**

```json
{
  "success": true,
  "message": "Callback triggered successfully"
}
```

---

### 9. List Merchants

Get all merchants.

**Endpoint:** `GET /admin/merchants`

**Headers:**
```
X-API-Key: your-admin-api-key
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "merchantToken": "uuid",
      "name": "Test Merchant",
      "active": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "_count": {
        "transactions": 150
      }
    }
  ]
}
```

---

### 10. Create Merchant

Create a new merchant.

**Endpoint:** `POST /admin/merchants`

**Headers:**
```
X-API-Key: your-admin-api-key
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "New Merchant",
  "merchantToken": "optional-uuid",
  "signatureSecret": "optional-uuid"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "merchantToken": "uuid",
    "signatureSecret": "uuid",
    "name": "New Merchant",
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input or signature |
| 401 | Unauthorized - Missing or invalid API key |
| 403 | Forbidden - Merchant inactive |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Testing Scenarios

### Test Success Payment

Amount ending in `.00` (default behavior)

```
amount=100.00
```

### Test Failed Payment

Configure a rule for amounts ending in `.99`:

```bash
curl -X POST http://localhost:3000/admin/scenarios \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"rules": [{"condition": "amount_ends_with", "value": ".99", "outcome": "FAIL"}]}'
```

Then create payment with:
```
amount=99.99
```

### Test Random Outcomes

```bash
curl -X POST http://localhost:3000/admin/scenarios \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"defaultOutcome": "RANDOM"}'
```

---

## Webhook/Callback Format

The server sends POST requests to `notify_url` with:

**Content-Type:** `application/x-www-form-urlencoded`

**Fields:**
```
merchant_reference=TEST-123
request_reference=uuid-here
currency=HKD
amount=100.00
status=1
sign=signature-here
```

**Your server should:**
1. Verify the signature
2. Validate amount, currency, merchant_reference
3. Check idempotency (don't process twice)
4. Return HTTP 200 OK

**Example Handler:**

```javascript
app.post('/payment/notify', (req, res) => {
  const { sign, ...data } = req.body;
  
  // Verify signature
  const calculatedSign = generateSignature(data, SECRET);
  if (sign !== calculatedSign) {
    return res.status(400).send('Invalid signature');
  }
  
  // Process payment
  // ...
  
  res.status(200).send('OK');
});
```

---

## Rate Limits

Default rate limits:
- 100 requests per 15 minutes per IP
- Configurable via environment variables

If exceeded, returns:
```json
{
  "success": false,
  "error": "Too many requests from this IP, please try again later"
}
```

