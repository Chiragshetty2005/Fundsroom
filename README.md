# Mini ERP + CRM Operations Portal

An internal operations portal for customer CRM, inventory, and sales challans.

## Stack

- React + TypeScript + Vite frontend
- Express + TypeScript REST API
- PostgreSQL + Prisma ORM

## Local PostgreSQL setup

1. Install PostgreSQL locally and ensure the server is running on `localhost:5432`.
2. Create a login role interactively; PostgreSQL will prompt for its password instead of placing it in shell history:

   ```bash
   createuser --login --pwprompt mini_erp_app
   ```

3. Create the application database owned by that role:

   ```bash
   createdb --owner=mini_erp_app mini_erp
   ```

   On systems where your PostgreSQL administrator is a separate OS user, prefix those commands with
   `sudo -u postgres`.

4. Copy `apps/api/.env.example` to `apps/api/.env`. Set `DB_PASSWORD` to the password entered above,
   choose a long `JWT_SECRET`, and choose a local `SEED_USER_PASSWORD` (at least 12 characters).
   All credentials stay in this ignored file. The host is configured solely through `DB_HOST`; when a
   Docker database is introduced later, change that value from `localhost` to the service name.

## Run the application

1. Install packages: `npm install`.
2. Generate the Prisma client: `npm run prisma:generate --workspace @mini-erp/api`.
3. Apply the tracked schema: `npm run prisma:deploy --workspace @mini-erp/api`.
4. Seed one local user for each required role: `npm run db:seed --workspace @mini-erp/api`.
5. Start both applications: `npm run dev`.

The frontend runs at `http://localhost:5173`; the API health endpoint is at
`http://localhost:3000/api/health`.

The seed uses the value of `SEED_USER_PASSWORD` for all four local accounts. Use the role-specific email
addresses listed in the seed file. Authentication and domain APIs will be added in subsequent steps.
