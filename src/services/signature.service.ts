import crypto from 'crypto';
import { stringify } from 'querystring';
import logger from '../utils/logger';

export class SignatureService {
  /**
   * Generate SHA-512 signature for payment request/response
   * @param fields - Key-value pairs to sign (excluding 'sign' field)
   * @param secret - Merchant signature secret
   * @returns SHA-512 hash in lowercase hex
   */
  generateSignature(fields: Record<string, string>, secret: string): string {
    try {
      // Sort fields alphabetically by key
      const sortedFields = this.sortFields(fields);
      
      // Build query string
      const queryString = stringify(sortedFields);
      
      // Append secret and generate SHA-512 hash
      const signatureString = queryString + secret;
      const signature = crypto
        .createHash('sha512')
        .update(signatureString)
        .digest('hex');
      
      logger.debug('Signature generated', {
        fieldsCount: Object.keys(fields).length,
        queryString: queryString.substring(0, 100) + '...',
      });
      
      return signature;
    } catch (error) {
      logger.error('Error generating signature', { error });
      throw new Error('Failed to generate signature');
    }
  }

  /**
   * Verify signature from incoming request
   * @param fields - Fields to verify (excluding 'sign' field)
   * @param receivedSign - Signature from request
   * @param secret - Merchant signature secret
   * @returns true if signature is valid
   */
  verifySignature(
    fields: Record<string, string>,
    receivedSign: string,
    secret: string
  ): boolean {
    try {
      const calculatedSign = this.generateSignature(fields, secret);
      const isValid = calculatedSign === receivedSign;
      
      if (!isValid) {
        logger.warn('Signature verification failed', {
          received: receivedSign.substring(0, 20) + '...',
          calculated: calculatedSign.substring(0, 20) + '...',
        });
      }
      
      return isValid;
    } catch (error) {
      logger.error('Error verifying signature', { error });
      return false;
    }
  }

  /**
   * Sort fields alphabetically by key
   * @param fields - Fields to sort
   * @returns Sorted fields object
   */
  private sortFields(fields: Record<string, string>): Record<string, string> {
    const sortedKeys = Object.keys(fields).sort();
    const sortedFields: Record<string, string> = {};
    
    for (const key of sortedKeys) {
      sortedFields[key] = fields[key];
    }
    
    return sortedFields;
  }

  /**
   * Build query string from sorted fields
   * @param fields - Fields to convert to query string
   * @returns Query string in format key1=value1&key2=value2
   */
  sortAndBuildQuery(fields: Record<string, string>): string {
    const sortedFields = this.sortFields(fields);
    return stringify(sortedFields);
  }
}

export const signatureService = new SignatureService();

