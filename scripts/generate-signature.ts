import crypto from 'crypto';
import { stringify } from 'querystring';

/**
 * Utility script to generate signatures for testing
 * Usage: ts-node scripts/generate-signature.ts
 */

const secret = '127f7830-b856-4ddf-92b4-a6478e38547b';

// Example payment request fields
const paymentFields = {
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

// Example query request fields
const queryFields = {
  merchant_reference: '1234567890',
};

function generateSignature(fields: Record<string, string>, secretKey: string): string {
  // Sort fields alphabetically
  const sortedKeys = Object.keys(fields).sort();
  const sortedFields: Record<string, string> = {};
  
  for (const key of sortedKeys) {
    sortedFields[key] = fields[key];
  }
  
  // Build query string
  const queryString = stringify(sortedFields);
  
  // Append secret and hash
  const signatureString = queryString + secretKey;
  const signature = crypto.createHash('sha512').update(signatureString).digest('hex');
  
  return signature;
}

console.log('=== Signature Generator ===\n');

console.log('1. Payment Request Signature:');
console.log('Fields:', JSON.stringify(paymentFields, null, 2));
const paymentSignature = generateSignature(paymentFields, secret);
console.log('Signature:', paymentSignature);
console.log('');

console.log('2. Query Request Signature:');
console.log('Fields:', JSON.stringify(queryFields, null, 2));
const querySignature = generateSignature(queryFields, secret);
console.log('Signature:', querySignature);
console.log('');

console.log('=== How to use ===');
console.log('1. Copy the fields you want to sign');
console.log('2. Sort them alphabetically by key');
console.log('3. Build query string: key1=value1&key2=value2');
console.log('4. Append secret key to the end');
console.log('5. Generate SHA-512 hash');

