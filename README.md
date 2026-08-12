# Mini ERP + CRM

Operations portal with customer CRM, inventory tracking, delivery challans, and role-based access control.

## Stack

- API: Express, TypeScript, Prisma
- Web: React, TypeScript, Vite
- DB: PostgreSQL

## Requirements

- Docker and Docker Compose

## Setup

1. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

   Set `DB_PASSWORD`, `JWT_SECRET`, and `SEED_USER_PASSWORD` in `.env`.

2. Build and start:

   ```bash
   docker compose up -d --build
   ```

3. Run migrations and seed demo users:

   ```bash
   make migrate
   make seed
   docker-compose exec api node create-users.js
   ```

4. Open the app:

   - Web: http://localhost:5173
   - API: http://localhost:3000/api

## Test accounts

Password for all accounts is set by `SEED_USER_PASSWORD` in `.env` (default: `localTestPass123`).

| Role | Email |
|---|---|
| Admin | admin@minierp.local |
| Sales | sales@minierp.local |
| Warehouse | warehouse@minierp.local |
| Accounts | accounts@minierp.local |
| User | user@minierp.local |

## Common commands

```bash
make logs      # stream logs
make down      # stop containers
make migrate   # run migrations
make seed      # seed demo data
```

## Roles

| Action | Admin | Sales | Warehouse | Accounts | User |
|---|---|---|---|---|---|
| Manage users | Yes | - | - | - | - |
| Customers | Full | Create/edit | View | View | - |
| Products | Full | View | Create/edit | View | - |
| Inventory | Full | View | Adjust | View | - |
| Challans | Full | Create/confirm | View | View | - |

## API routes

**Auth**
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

**Users** (admin only)
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id/role`
- `DELETE /api/users/:id`

**Customers**
- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `POST /api/customers/:id/follow-ups`

**Products**
- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `POST /api/products/:id/image`
- `DELETE /api/products/:id/image`
- `DELETE /api/products/:id`

**Inventory**
- `GET /api/inventory/movements`
- `POST /api/inventory/adjust`

**Challans**
- `GET /api/challans`
- `POST /api/challans`
- `GET /api/challans/:id`
- `POST /api/challans/:id/confirm`
- `POST /api/challans/:id/cancel`

## S3 (optional)

Add to `.env` to store product images in S3 instead of local fallback:

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
```

Leave blank to skip S3 and use local image storage.