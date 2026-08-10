import 'dotenv/config';

import { defineConfig } from 'prisma/config';

import { databaseUrl } from './src/config/database.ts';

process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  engine: 'classic',
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
