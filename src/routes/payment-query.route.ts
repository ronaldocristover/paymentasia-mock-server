import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types/express.types';
import { validateMerchant, validateQueryRequest, validateSignature } from '../middleware/validation.middleware';
import { paymentService } from '../services/payment.service';
import logger from '../utils/logger';

const router = Router();

router.post(
  '/:merchantToken/payment/query',
  validateMerchant,
  validateQueryRequest,
  validateSignature,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { merchant_reference } = req.body;

      logger.info('Payment query request', {
        merchantToken: req.merchant?.merchantToken,
        merchantReference: merchant_reference,
      });

      // Get transactions by merchant reference
      const transactions = await paymentService.getTransactionsByMerchantReference(
        merchant_reference
      );

      // Return JSON array (empty if no transactions found)
      return res.json(transactions);

    } catch (error) {
      next(error);
    }
  }
);

export default router;

