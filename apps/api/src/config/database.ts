import 'dotenv/config';

import { z } from 'zod';

const databaseEnvironmentSchema = z.object({
  DB_HOST: z.string().trim().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65_535),
  DB_NAME: z.string().trim().min(1),
  DB_USER: z.string().trim().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_SCHEMA: z
    .string()
    .trim()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
});

export type DatabaseConfig = z.infer<typeof databaseEnvironmentSchema>;

export function readDatabaseConfig(environment: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  return databaseEnvironmentSchema.parse(environment);
}

export function createDatabaseUrl(config: DatabaseConfig): string {
  const user = encodeURIComponent(config.DB_USER);
  const password = encodeURIComponent(config.DB_PASSWORD);
  const databaseName = encodeURIComponent(config.DB_NAME);
  const schema = encodeURIComponent(config.DB_SCHEMA);

  return `postgresql://${user}:${password}@${config.DB_HOST}:${config.DB_PORT}/${databaseName}?schema=${schema}`;
}

export const databaseConfig = readDatabaseConfig();
export const databaseUrl = createDatabaseUrl(databaseConfig);
