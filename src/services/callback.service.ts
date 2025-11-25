import axios from 'axios';
import { Transaction } from '@prisma/client';
import { stringify } from 'querystring';
import prisma from '../utils/prisma';
import { PaymentCallback } from '../types/payment.types';
import { signatureService } from './signature.service';
import logger from '../utils/logger';

export class CallbackService {
  /**
   * Schedule a callback with delay
   */
  async scheduleCallback(transactionId: string, delayMs: number): Promise<void> {
    logger.info('Callback scheduled', { transactionId, delayMs });

    setTimeout(async () => {
      try {
        const transaction = await prisma.transaction.findUnique({
          where: { id: transactionId },
          include: { merchant: true },
        });

        if (transaction) {
          await this.sendCallback(transaction);
        }
      } catch (error) {
        logger.error('Error in scheduled callback', { error, transactionId });
      }
    }, delayMs);
  }

  /**
   * Send callback to notify_url
   */
  async sendCallback(transaction: Transaction & { merchant?: any }): Promise<boolean> {
    const maxAttempts = 3;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;

      try {
        logger.info('Sending callback', {
          attempt,
          transactionId: transaction.id,
          notifyUrl: transaction.notifyUrl,
        });

        // Get merchant secret
        let merchant = transaction.merchant;
        if (!merchant) {
          merchant = await prisma.merchant.findUnique({
            where: { id: transaction.merchantId },
          });
        }

        if (!merchant) {
          logger.error('Merchant not found for callback', { merchantId: transaction.merchantId });
          return false;
        }

        // Build callback payload
        const payload = this.buildCallbackPayload(transaction, merchant.signatureSecret);

        // Send POST request
        const response = await axios.post(transaction.notifyUrl, stringify(payload), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
          validateStatus: (status) => status === 200,
        });

        // Update callback tracking
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            callbackSent: true,
            callbackAttempts: attempt,
            lastCallbackAt: new Date(),
          },
        });

        logger.info('Callback sent successfully', {
          transactionId: transaction.id,
          attempt,
          responseStatus: response.status,
        });

        return true;
      } catch (error: any) {
        logger.error('Callback attempt failed', {
          transactionId: transaction.id,
          attempt,
          error: error.message,
        });

        // Update attempt count
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            callbackAttempts: attempt,
            lastCallbackAt: new Date(),
          },
        });

        // Wait before retry (exponential backoff)
        if (attempt < maxAttempts) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    return false;
  }

  /**
   * Build callback payload with signature
   */
  buildCallbackPayload(transaction: Transaction, secret: string): PaymentCallback {
    const fields = {
      amount: transaction.amount.toFixed(2),
      currency: transaction.currency,
      merchant_reference: transaction.merchantReference,
      request_reference: transaction.requestReference,
      status: transaction.status,
    };

    const signature = signatureService.generateSignature(fields, secret);

    return {
      ...fields,
      sign: signature,
    };
  }

  /**
   * Manually trigger callback for a transaction
   */
  async triggerCallbackManually(transactionId: string): Promise<boolean> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { merchant: true },
      });

      if (!transaction) {
        logger.error('Transaction not found for manual callback', { transactionId });
        return false;
      }

      return await this.sendCallback(transaction);
    } catch (error) {
      logger.error('Error triggering manual callback', { error, transactionId });
      return false;
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const callbackService = new CallbackService();

