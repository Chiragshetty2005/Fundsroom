import 'dotenv/config';

import { z } from 'zod';

import { databaseConfig } from './database.js';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(24),
});

export const env = {
  ...environmentSchema.parse(process.env),
  database: databaseConfig,
};
