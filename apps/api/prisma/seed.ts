import 'dotenv/config';

import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

import { databaseUrl } from '../src/config/database.ts';

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
});
const seedPassword = process.env.SEED_USER_PASSWORD;

const users = [
  { name: 'Admin User', email: 'admin@minierp.local', role: Role.ADMIN },
  { name: 'Sales User', email: 'sales@minierp.local', role: Role.SALES },
  { name: 'Warehouse User', email: 'warehouse@minierp.local', role: Role.WAREHOUSE },
  { name: 'Accounts User', email: 'accounts@minierp.local', role: Role.ACCOUNTS },
  { name: 'Standard User', email: 'user@minierp.local', role: Role.USER },
] as const;

async function main() {
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error('SEED_USER_PASSWORD must be set to a value of at least 12 characters.');
  }

  const passwordHash = await hash(seedPassword, 12);

  await Promise.all(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        create: { ...user, passwordHash },
        update: { name: user.name, role: user.role, passwordHash },
      }),
    ),
  );

  await prisma.challanSequence.upsert({
    where: { id: 1 },
    create: { id: 1, nextValue: 1 },
    update: {},
  });
}

main()
  .then(() => console.info('Database seed completed.'))
  .catch((error: unknown) => {
    console.error('Database seed failed.', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
