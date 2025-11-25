import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config';
import { AppError } from './error-handler.middleware';
import logger from '../utils/logger';

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.apiKey) {
    logger.warn('Unauthorized API access attempt', {
      path: req.path,
      ip: req.ip,
    });
    throw new AppError('Unauthorized', 401);
  }

  next();
};

