import { Router, Request, Response } from 'express';
import { apiKeyAuth } from '../middleware/auth.middleware';
import { paymentService } from '../services/payment.service';
import { callbackService } from '../services/callback.service';
import { scenarioService } from '../services/scenario.service';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { AppError } from '../middleware/error-handler.middleware';
import { z } from 'zod';

const router = Router();

// Apply API key authentication to all admin routes
router.use(apiKeyAuth);

// Get all transactions with pagination
router.get('/transactions', async (req: Request, res: Response, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await paymentService.getAllTransactions(page, limit);

    return res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/transactions/:id', async (req: Request, res: Response, next) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: {
        merchant: {
          select: {
            name: true,
            merchantToken: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new AppError('Transaction not found', 404);
    }

    return res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

// Configure scenario
const scenarioSchema = z.object({
  defaultOutcome: z.enum(['SUCCESS', 'FAIL', 'RANDOM']).optional(),
  callbackDelay: z.number().optional(),
  processingDelay: z.number().optional(),
  rules: z.array(z.object({
    condition: z.enum(['amount_ends_with', 'network', 'amount_equals']),
    value: z.string(),
    outcome: z.enum(['SUCCESS', 'FAIL']),
  })).optional(),
});

router.post('/scenarios', async (req: Request, res: Response, next) => {
  try {
    const result = scenarioSchema.safeParse(req.body);

    if (!result.success) {
      throw new AppError('Invalid scenario configuration', 400);
    }

    scenarioService.setScenario(result.data);

    logger.info('Scenario configuration updated via admin API', result.data);

    return res.json({
      success: true,
      message: 'Scenario configuration updated',
      data: scenarioService.getScenarioRules(),
    });
  } catch (error) {
    next(error);
  }
});

// Get current scenario configuration
router.get('/scenarios', async (req: Request, res: Response, next) => {
  try {
    const config = scenarioService.getScenarioRules();

    return res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
});

// Manually trigger callback
router.post('/callbacks/:id/trigger', async (req: Request, res: Response, next) => {
  try {
    const success = await callbackService.triggerCallbackManually(req.params.id);

    if (!success) {
      throw new AppError('Failed to trigger callback', 500);
    }

    logger.info('Manual callback triggered via admin API', { transactionId: req.params.id });

    return res.json({
      success: true,
      message: 'Callback triggered successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get all merchants
router.get('/merchants', async (req: Request, res: Response, next) => {
  try {
    const merchants = await prisma.merchant.findMany({
      select: {
        id: true,
        merchantToken: true,
        name: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: merchants,
    });
  } catch (error) {
    next(error);
  }
});

// Create new merchant
const merchantSchema = z.object({
  name: z.string().min(1),
  merchantToken: z.string().uuid().optional(),
  signatureSecret: z.string().uuid().optional(),
});

router.post('/merchants', async (req: Request, res: Response, next) => {
  try {
    const result = merchantSchema.safeParse(req.body);

    if (!result.success) {
      throw new AppError('Invalid merchant data', 400);
    }

    const merchant = await prisma.merchant.create({
      data: {
        name: result.data.name,
        merchantToken: result.data.merchantToken,
        signatureSecret: result.data.signatureSecret,
      },
    });

    logger.info('New merchant created via admin API', {
      merchantId: merchant.id,
      merchantToken: merchant.merchantToken,
    });

    return res.json({
      success: true,
      data: merchant,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

