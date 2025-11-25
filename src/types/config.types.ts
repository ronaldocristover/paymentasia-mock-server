export interface AppConfig {
  port: number;
  nodeEnv: string;
  apiKey: string;
  database: {
    url: string;
  };
  defaultMerchant: {
    token: string;
    secret: string;
  };
  payment: {
    outcome: string;
    callbackDelay: number;
    processingDelay: number;
  };
  security: {
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
    corsOrigin: string;
  };
  logging: {
    level: string;
  };
}

