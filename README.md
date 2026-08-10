# Mini ERP + CRM Operations Portal

An internal operations portal for customer CRM, inventory, and sales challans.

## Stack

- React + TypeScript + Vite frontend
- Express + TypeScript REST API
- PostgreSQL + Prisma ORM
- Docker Compose for local PostgreSQL

## Local development

1. Copy `apps/api/.env.example` to `apps/api/.env` and set a secure `JWT_SECRET`.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install packages: `npm install`.
4. Start both applications: `npm run dev`.

The frontend runs at `http://localhost:5173`; the API health endpoint is at
`http://localhost:3000/api/health`.

Database schema, migrations, authentication, and domain modules will be added in subsequent steps.
