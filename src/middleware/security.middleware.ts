import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../config/config';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

export const corsMiddleware = cors({
  origin: config.security.corsOrigin === '*' ? '*' : config.security.corsOrigin.split(','),
  credentials: true,
  optionsSuccessStatus: 200,
});

export const rateLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

