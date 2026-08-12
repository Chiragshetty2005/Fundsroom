# @mini-erp/api — Backend Service

REST API service for the Mini ERP & CRM Portal.

For full API specifications, endpoint payloads, query parameters, and responses, refer to the complete [API Documentation](../../API_DOCUMENTATION.md).

## Quick Overview

- **Port**: `3000` (Default)
- **Base URL**: `http://localhost:3000/api`
- **Auth Strategy**: `HttpOnly` Cookies (`auth_token`) + Bearer Token fallback
- **Database**: PostgreSQL with Prisma ORM
- **Object Storage**: AWS S3 (with data URI fallback)

## Directory Structure

```
src/
├── app.ts                # Express app initialization, CORS, cookie-parser
├── server.ts             # Entry point & graceful shutdown
├── config/
│   ├── database.ts       # Database URL builder
│   └── env.ts            # Environment variables (Zod)
├── lib/
│   ├── jwt.ts            # JWT signing & verification
│   ├── prisma.ts         # Prisma client singleton
│   └── s3.ts             # AWS S3 image storage & pre-signed URLs
├── middleware/
│   ├── authenticate.ts   # Cookie/JWT authentication middleware
│   ├── authorize.ts      # Role-Based Access Control (RBAC)
│   └── error-handler.ts  # Centralized error handler
├── routes/
│   ├── auth.ts           # /api/auth (signup, login, logout, me)
│   ├── challans.ts       # /api/challans (sales orders & atomic stock deduction)
│   ├── customers.ts      # /api/customers (CRM & follow-ups)
│   ├── health.ts         # /api/health (deep DB health check)
│   ├── inventory.ts      # /api/inventory (movements & manual adjustments)
│   ├── products.ts       # /api/products (product catalog & S3 images)
│   └── users.ts          # /api/users (user & role management)
└── types/
    └── express.d.ts      # User declaration extensions
```

## Useful Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Start dev server with watch mode
npm run dev

# Run type check
npm run check

# Build production dist/
npm run build
```
