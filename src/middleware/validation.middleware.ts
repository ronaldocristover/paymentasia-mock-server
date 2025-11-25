import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { signatureService } from '../services/signature.service';
import { AppError } from './error-handler.middleware';
import { AuthenticatedRequest } from '../types/express.types';
import logger from '../utils/logger';

// Payment Request Schema
export const paymentRequestSchema = z.object({
  merchant_reference: z.string().max(36),
  currency: z.enum(['HKD', 'USD', 'CNY']),
  amount: z.string().regex(/^\d+\.\d{2}$/),
  customer_ip: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/),
  customer_first_name: z.string().max(255),
  customer_last_name: z.string().max(255),
  customer_phone: z.string().max(64),
  customer_email: z.string().email().max(255),
  network: z.enum(['Alipay', 'Wechat', 'CUP', 'CreditCard', 'Atome']),
  subject: z.string().max(255),
  notify_url: z.string().url().max(255),
  return_url: z.string().url().max(255).optional(),
  customer_address: z.string().optional(),
  customer_state: z.string().length(2).optional(),
  customer_country: z.string().length(2).optional(),
  customer_postal_code: z.string().max(64).optional(),
  sign: z.string().length(128),
});

// Query Request Schema
export const queryRequestSchema = z.object({
  merchant_reference: z.string().max(36),
  sign: z.string().length(128),
});

// Validate merchant token and attach to request
export const validateMerchant = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const merchantToken = req.params.merchantToken;

    if (!merchantToken) {
      throw new AppError('Merchant token is required', 400);
    }

    const merchant = await prisma.merchant.findUnique({
      where: { merchantToken },
    });

    if (!merchant) {
      logger.warn('Merchant not found', { merchantToken });
      throw new AppError('Invalid merchant token', 404);
    }

    if (!merchant.active) {
      logger.warn('Inactive merchant attempted access', { merchantToken });
      throw new AppError('Merchant is inactive', 403);
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    next(error);
  }
};

// Validate payment request
export const validatePaymentRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = paymentRequestSchema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      logger.warn('Payment request validation failed', { errors });
      throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
    }

    // Additional validation for CreditCard and Atome
    const { network, customer_address, customer_country, customer_postal_code, amount } = result.data;

    if ((network === 'CreditCard' || network === 'Atome') && 
        (!customer_address || !customer_country || !customer_postal_code)) {
      throw new AppError(
        `${network} requires customer_address, customer_country, and customer_postal_code`,
        400
      );
    }

    // Validate Atome minimum amount
    if (network === 'Atome' && parseFloat(amount) < 30.0) {
      throw new AppError('Atome requires minimum amount of 30.00', 400);
    }

    // Validate currency for network
    if (network !== 'CreditCard' && result.data.currency !== 'HKD') {
      throw new AppError(`${network} only supports HKD currency`, 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validate signature
export const validateSignature = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.merchant) {
      throw new AppError('Merchant not authenticated', 401);
    }

    const { sign, ...fields } = req.body;

    if (!sign) {
      throw new AppError('Signature is required', 400);
    }

    // Convert all fields to strings for signature verification
    const stringFields: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        stringFields[key] = String(value);
      }
    }

    const isValid = signatureService.verifySignature(
      stringFields,
      sign,
      req.merchant.signatureSecret
    );

    if (!isValid) {
      logger.warn('Invalid signature', {
        merchantToken: req.merchant.merchantToken,
        fields: Object.keys(stringFields),
      });
      throw new AppError('Invalid signature', 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Validate query request
export const validateQueryRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = queryRequestSchema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
    }

    next();
  } catch (error) {
    next(error);
  }
};

