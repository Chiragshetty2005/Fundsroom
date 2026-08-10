import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res
      .status(200)
      .json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    next(new AppError(503, 'Database is unavailable.'));
  }
});
