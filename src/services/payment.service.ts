import { Transaction } from '@prisma/client';
import prisma from '../utils/prisma';
import { PaymentRequest, TransactionQuery } from '../types/payment.types';
import { scenarioService } from './scenario.service';
import logger from '../utils/logger';

export class PaymentService {
  /**
   * Create a new transaction
   */
  async createTransaction(
    data: PaymentRequest,
    merchantId: string
  ): Promise<Transaction> {
    try {
      const transaction = await prisma.transaction.create({
        data: {
          merchantId,
          merchantReference: data.merchant_reference,
          currency: data.currency,
          amount: data.amount,
          network: data.network,
          subject: data.subject,
          customerIp: data.customer_ip,
          customerFirstName: data.customer_first_name,
          customerLastName: data.customer_last_name,
          customerEmail: data.customer_email,
          customerPhone: data.customer_phone,
          customerAddress: data.customer_address,
          customerState: data.customer_state,
          customerCountry: data.customer_country,
          customerPostalCode: data.customer_postal_code,
          notifyUrl: data.notify_url,
          returnUrl: data.return_url,
          status: '0', // PENDING
          type: 'Sale',
        },
      });

      logger.info('Transaction created', {
        id: transaction.id,
        requestReference: transaction.requestReference,
        merchantReference: transaction.merchantReference,
      });

      return transaction;
    } catch (error) {
      logger.error('Error creating transaction', { error, data });
      throw new Error('Failed to create transaction');
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    requestReference: string,
    status: string,
    completedTime?: Date
  ): Promise<Transaction> {
    try {
      const transaction = await prisma.transaction.update({
        where: { requestReference },
        data: {
          status,
          completedTime: completedTime || (status === '1' || status === '2' ? new Date() : null),
        },
      });

      logger.info('Transaction status updated', {
        requestReference,
        status,
        completedTime,
      });

      return transaction;
    } catch (error) {
      logger.error('Error updating transaction status', { error, requestReference, status });
      throw new Error('Failed to update transaction status');
    }
  }

  /**
   * Get transaction by request reference
   */
  async getTransactionByRequestReference(requestReference: string): Promise<Transaction | null> {
    try {
      return await prisma.transaction.findUnique({
        where: { requestReference },
      });
    } catch (error) {
      logger.error('Error fetching transaction', { error, requestReference });
      return null;
    }
  }

  /**
   * Get transactions by merchant reference
   */
  async getTransactionsByMerchantReference(
    merchantReference: string
  ): Promise<TransactionQuery[]> {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { merchantReference },
        orderBy: { createdTime: 'asc' },
      });

      return transactions.map((tx) => ({
        type: tx.type as 'Sale' | 'Refund',
        merchant_reference: tx.merchantReference,
        request_reference: tx.requestReference,
        status: tx.status,
        currency: tx.currency,
        amount: tx.amount.toFixed(6),
        created_time: Math.floor(tx.createdTime.getTime() / 1000).toString(),
        completed_time: tx.completedTime
          ? Math.floor(tx.completedTime.getTime() / 1000).toString()
          : null,
      }));
    } catch (error) {
      logger.error('Error fetching transactions by merchant reference', {
        error,
        merchantReference,
      });
      return [];
    }
  }

  /**
   * Determine payment outcome based on scenario
   */
  determinePaymentOutcome(amount: string, network: string, merchantToken: string): '1' | '2' {
    return scenarioService.getOutcomeForTransaction(amount, network, merchantToken);
  }

  /**
   * Get all transactions with pagination
   */
  async getAllTransactions(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          skip,
          take: limit,
          orderBy: { createdTime: 'desc' },
          include: {
            merchant: {
              select: {
                name: true,
                merchantToken: true,
              },
            },
          },
        }),
        prisma.transaction.count(),
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching all transactions', { error });
      throw new Error('Failed to fetch transactions');
    }
  }
}

export const paymentService = new PaymentService();

