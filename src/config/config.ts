import dotenv from 'dotenv';
import { AppConfig } from '../types/config.types';

dotenv.config();

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY || 'your-admin-api-key-change-this',
  database: {
    url: process.env.DATABASE_URL || '',
  },
  defaultMerchant: {
    token: process.env.DEFAULT_MERCHANT_TOKEN || 'ae476881-7bfc-4da8-bc7d-8203ad0fb28c',
    secret: process.env.DEFAULT_SIGNATURE_SECRET || '127f7830-b856-4ddf-92b4-a6478e38547b',
  },
  payment: {
    outcome: process.env.DEFAULT_PAYMENT_OUTCOME || 'SUCCESS',
    callbackDelay: parseInt(process.env.CALLBACK_DELAY_MS || '3000', 10),
    processingDelay: parseInt(process.env.PROCESSING_DELAY_MS || '1000', 10),
  },
  security: {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

