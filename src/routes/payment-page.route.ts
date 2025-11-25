import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types/express.types';
import { validateMerchant, validatePaymentRequest, validateSignature } from '../middleware/validation.middleware';
import { paymentService } from '../services/payment.service';
import { callbackService } from '../services/callback.service';
import { config } from '../config/config';
import logger from '../utils/logger';
import { signatureService } from '../services/signature.service';

const router = Router();

router.post(
  '/app/page/:merchantToken',
  validateMerchant,
  validatePaymentRequest,
  validateSignature,
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      if (!req.merchant) {
        return res.status(401).json({ error: 'Merchant not authenticated' });
      }

      // Create transaction
      const transaction = await paymentService.createTransaction(
        req.body,
        req.merchant.id
      );

      // Schedule status updates
      setTimeout(async () => {
        // Update to PROCESSING after processing delay
        await paymentService.updateTransactionStatus(
          transaction.requestReference,
          '4' // PROCESSING
        );

        logger.info('Transaction moved to PROCESSING', {
          requestReference: transaction.requestReference,
        });

        // Determine final outcome
        const finalStatus = paymentService.determinePaymentOutcome(
          req.body.amount,
          req.body.network,
          req.merchant!.merchantToken
        );

        // Schedule final status update and callback
        setTimeout(async () => {
          await paymentService.updateTransactionStatus(
            transaction.requestReference,
            finalStatus,
            new Date()
          );

          logger.info('Transaction completed', {
            requestReference: transaction.requestReference,
            status: finalStatus,
          });

          // Send callback
          await callbackService.scheduleCallback(
            transaction.id,
            0 // Send immediately after status update
          );
        }, config.payment.callbackDelay - config.payment.processingDelay);

      }, config.payment.processingDelay);

      // Build return URL with query parameters
      const returnUrl = req.body.return_url;
      
      if (returnUrl) {
        // For now, redirect immediately with pending status
        // In real scenario, this would happen after payment completion
        const callbackFields = {
          amount: transaction.amount.toFixed(2),
          currency: transaction.currency,
          merchant_reference: transaction.merchantReference,
          request_reference: transaction.requestReference,
          status: '0', // PENDING initially
        };

        const signature = signatureService.generateSignature(
          callbackFields,
          req.merchant.signatureSecret
        );

        const queryParams = new URLSearchParams({
          ...callbackFields,
          sign: signature,
        });

        const redirectUrl = `${returnUrl}?${queryParams.toString()}`;

        // Return HTML that redirects customer
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8"/>
            <title>Processing Payment...</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f5f5f5;
              }
              .container {
                text-align: center;
                padding: 40px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3498db;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
            <script>
              setTimeout(function() {
                window.location.href = "${redirectUrl}";
              }, 2000);
            </script>
          </head>
          <body>
            <div class="container">
              <div class="spinner"></div>
              <h2>Processing Payment</h2>
              <p>Please wait while we process your payment...</p>
              <p>Reference: ${transaction.requestReference}</p>
            </div>
          </body>
          </html>
        `);
      }

      // If no return URL, just return JSON response
      return res.json({
        success: true,
        request_reference: transaction.requestReference,
        merchant_reference: transaction.merchantReference,
        status: transaction.status,
      });

    } catch (error) {
      next(error);
    }
  }
);

export default router;

