import axios from "axios";
import crypto from "crypto";
import { stringify } from "querystring";

/**
 * End-to-end test script for payment flow
 * Usage: ts-node scripts/test-payment-flow.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const MERCHANT_TOKEN = "ae476881-7bfc-4da8-bc7d-8203ad0fb28c";
const SECRET = "127f7830-b856-4ddf-92b4-a6478e38547b";

function generateSignature(fields: Record<string, string>): string {
  const sortedKeys = Object.keys(fields).sort();
  const sortedFields: Record<string, string> = {};

  for (const key of sortedKeys) {
    sortedFields[key] = fields[key];
  }

  const queryString = stringify(sortedFields);
  const signatureString = queryString + SECRET;
  const signature = crypto
    .createHash("sha512")
    .update(signatureString)
    .digest("hex");

  return signature;
}

async function testPaymentFlow() {
  console.log("=== Testing PaymentAsia Mock Server ===\n");

  // Test 1: Health Check
  console.log("1. Testing health check...");
  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log("✓ Health check passed:", healthResponse.data);
  } catch (error: any) {
    console.error("✗ Health check failed:", error.message);
    return;
  }

  // Test 2: Create Payment Request
  console.log("\n2. Creating payment request...");
  const merchantRef = `TEST-${Date.now()}`;
  const paymentFields = {
    amount: "100.00",
    currency: "HKD",
    customer_email: "test@example.com",
    customer_first_name: "Test",
    customer_ip: "123.123.123.123",
    customer_last_name: "User",
    customer_phone: "0123123123",
    merchant_reference: merchantRef,
    network: "Alipay",
    notify_url: "https://webhook.site/test",
    return_url: "https://example.com/return",
    subject: "Test Payment",
  };

  const paymentSignature = generateSignature(paymentFields);

  try {
    const paymentResponse = await axios.post(
      `${BASE_URL}/app/page/${MERCHANT_TOKEN}`,
      stringify({ ...paymentFields, sign: paymentSignature }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      }
    );
    console.log("✓ Payment request created");
    console.log("  Merchant Reference:", merchantRef);
  } catch (error: any) {
    console.error("✗ Payment request failed:", error.message);
    return;
  }

  // Wait for processing
  console.log("\n3. Waiting for payment processing (5 seconds)...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Test 3: Query Payment Status
  console.log("\n4. Querying payment status...");
  const queryFields = {
    merchant_reference: merchantRef,
  };
  const querySignature = generateSignature(queryFields);

  try {
    const queryResponse = await axios.post(
      `${BASE_URL}/${MERCHANT_TOKEN}/payment/query`,
      stringify({ ...queryFields, sign: querySignature }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    console.log("✓ Query successful");
    console.log("  Transactions found:", queryResponse.data.length);
    if (queryResponse.data.length > 0) {
      const tx = queryResponse.data[0];
      console.log(
        "  Status:",
        tx.status,
        "(0=PENDING, 1=SUCCESS, 2=FAIL, 4=PROCESSING)"
      );
      console.log("  Request Reference:", tx.request_reference);
      console.log("  Amount:", tx.amount, tx.currency);
    }
  } catch (error: any) {
    console.error("✗ Query failed:", error.message);
  }

  console.log("\n=== Test Completed ===");
}

testPaymentFlow().catch(console.error);
