#! /usr/bin

touch ./apps/api/create-users.js

cat >./apps/api/create-users.js <<'EOF'

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const users = [
    { name: 'Admin User', email: 'admin@minierp.local', role: 'ADMIN' },
    { name: 'Sales User', email: 'sales@minierp.local', role: 'SALES' },
    { name: 'Warehouse User', email: 'warehouse@minierp.local', role: 'WAREHOUSE' },
    { name: 'Accounts User', email: 'accounts@minierp.local', role: 'ACCOUNTS' },
];

async function main() {
    console.log('Connecting with DATABASE_URL:', process.env.DATABASE_URL);

    const before = await prisma.user.count();
    console.log('User count before seeding:', before);

    const password = process.env.SEED_USER_PASSWORD || 'localTestPass123';
    console.log('Using seed password (length check only):', password.length);

    const passwordHash = await bcrypt.hash(password, 10);

    for (const u of users) {
        try {
            const result = await prisma.user.upsert({
                where: { email: u.email },
                create: { name: u.name, email: u.email, role: u.role, passwordHash },
                update: { name: u.name, role: u.role, passwordHash },
            });
            console.log('Upserted:', result.email, result.role, result.id);
        } catch (err) {
            console.error('FAILED on', u.email, err);
        }
    }

    const after = await prisma.user.count();
    console.log('User count after seeding:', after);
}

main()
    .catch((e) => {
        console.error('Script-level failure:', e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
EOF

echo "Now check if the files are placed"
echo "Run 'npm run docker:up'"
echo "Once docker container is up and running -> run 'docker exec -it mini_erp_api node create-users.js'"
