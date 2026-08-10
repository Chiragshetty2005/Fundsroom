import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

async function startServer() {
  try {
    await prisma.$connect();

    const server = app.listen(env.PORT, () => {
      console.info(`API listening on http://localhost:${env.PORT}`);
    });

    const shutdown = (signal: NodeJS.Signals) => {
      console.info(`${signal} received. Closing server and database connection.`);
      server.close(() => {
        void prisma.$disconnect().finally(() => process.exit(0));
      });
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    console.error(
      'Unable to connect to PostgreSQL. Check the DB_* values in apps/api/.env.',
      error,
    );
    await prisma.$disconnect();
    process.exit(1);
  }
}

void startServer();
