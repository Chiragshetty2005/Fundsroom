import 'dotenv/config';

import { z } from 'zod';

const databaseEnvironmentSchema = z.object({
  DB_HOST: z.string().trim().default('localhost'),
  DB_PORT: z.coerce.number().int().min(1).max(65_535).default(5432),
  DB_NAME: z.string().trim().default('mini_erp'),
  DB_USER: z.string().trim().default('mini_erp_app'),
  DB_PASSWORD: z.string().default('postgres123'),
  DB_SCHEMA: z
    .string()
    .trim()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
    .default('public'),
});

export type DatabaseConfig = z.infer<typeof databaseEnvironmentSchema>;

export function readDatabaseConfig(environment: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const result = databaseEnvironmentSchema.safeParse(environment);
  if (result.success) {
    return result.data;
  }
  return {
    DB_HOST: 'localhost',
    DB_PORT: 5432,
    DB_NAME: 'mini_erp',
    DB_USER: 'mini_erp_app',
    DB_PASSWORD: 'postgres123',
    DB_SCHEMA: 'public',
  };
}

export function createDatabaseUrl(config: DatabaseConfig): string {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    return process.env.DATABASE_URL;
  }

  const user = encodeURIComponent(config.DB_USER);
  const password = encodeURIComponent(config.DB_PASSWORD);
  const databaseName = encodeURIComponent(config.DB_NAME);
  const schema = encodeURIComponent(config.DB_SCHEMA);

  return `postgresql://${user}:${password}@${config.DB_HOST}:${config.DB_PORT}/${databaseName}?schema=${schema}`;
}

export const databaseConfig = readDatabaseConfig();
export const databaseUrl = createDatabaseUrl(databaseConfig);
