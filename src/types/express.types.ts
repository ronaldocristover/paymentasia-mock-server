import { Request } from 'express';
import { Merchant } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  merchant?: Merchant;
}

