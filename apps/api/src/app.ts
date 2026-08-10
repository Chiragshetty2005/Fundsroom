import cors from 'cors';
import express from 'express';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';

export const app = express();

app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/health', healthRouter);
app.use(notFoundHandler);
app.use(errorHandler);

