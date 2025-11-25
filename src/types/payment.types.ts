export type PaymentNetwork = 'Alipay' | 'Wechat' | 'CUP' | 'CreditCard' | 'Atome';
export type PaymentStatus = '0' | '1' | '2' | '4'; // PENDING, SUCCESS, FAIL, PROCESSING
export type TransactionType = 'Sale' | 'Refund';

export interface PaymentRequest {
  merchant_reference: string;
  currency: string;
  amount: string;
  customer_ip: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string;
  network: PaymentNetwork;
  subject: string;
  notify_url: string;
  return_url?: string;
  customer_address?: string;
  customer_state?: string;
  customer_country?: string;
  customer_postal_code?: string;
  sign: string;
}

export interface PaymentCallback {
  merchant_reference: string;
  request_reference: string;
  currency: string;
  amount: string;
  status: PaymentStatus;
  sign: string;
}

export interface TransactionQuery {
  type: TransactionType;
  merchant_reference: string;
  request_reference: string;
  status: string;
  currency: string;
  amount: string;
  created_time: string;
  completed_time: string | null;
}

export interface QueryRequest {
  merchant_reference: string;
  sign: string;
}

export interface ScenarioConfig {
  defaultOutcome: 'SUCCESS' | 'FAIL' | 'RANDOM';
  callbackDelay: number;
  processingDelay: number;
  rules: ScenarioRule[];
}

export interface ScenarioRule {
  condition: 'amount_ends_with' | 'network' | 'amount_equals';
  value: string;
  outcome: 'SUCCESS' | 'FAIL';
}

