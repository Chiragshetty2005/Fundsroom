# Mini ERP + CRM Operations Portal

An enterprise operations portal for wholesale and distribution businesses featuring customer CRM, inventory ledger, delivery challan generation with atomic stock deductions, JWT authentication, and fine-grained Role-Based Access Control (RBAC).

---

## Architecture & Repository Pattern

This repository is organized as an **npm workspaces monorepo**:

```text
├── apps/
│   ├── api/                 # Express 5 + TypeScript + Prisma API
│   │   ├── prisma/          # Prisma schema, migrations & seed scripts
│   │   ├── src/
│   │   │   ├── config/      # Environment & database configuration (Zod validated)
│   │   │   ├── middleware/  # JWT authenticate, authorize RBAC, error handlers
│   │   │   └── routes/      # Auth, Users, Customers, Products, Inventory, Challans
│   │   └── Dockerfile       # Multi-stage production API image
│   └── web/                 # React 19 + TypeScript + Vite SPA
│       ├── src/
│       │   ├── api/         # Centralized API client with automatic JWT token injection
│       │   ├── components/  # Layout, common UI widgets, RoleProtectedRoute
│       │   ├── context/     # AuthContext (session hydration, signup/login) & ToastContext
│       │   └── pages/       # Dashboard, CRM, Products, Inventory, Challans, Admin Users
│       ├── nginx.conf       # Production Nginx reverse proxy & SPA routing
│       └── Dockerfile       # Multi-stage production Web image
├── docker-compose.yml       # Production-ready PostgreSQL, API, and Web orchestration
├── Makefile                 # Convenient command shortcuts
├── package.json             # Root monorepo scripts & dependencies
└── .env.example             # Complete environment configuration template
```

---

## Role-Based Access Control (RBAC) Matrix

| Resource / Action | ADMIN | SALES | WAREHOUSE | ACCOUNTS | USER (Default) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **User Admin (`/admin`)** | Full (Manage Roles) | None | None | None | None |
| **Customers (CRM)** | Full | Create / Edit / Follow-ups | View Only | View Only | None |
| **Products** | Full | View Only | Create / Edit | View Only | None |
| **Inventory Movements** | Full | View Only | Adjust Stock (IN/OUT) | View Only | None |
| **Sales Challans** | Full | Create / Confirm / Cancel | View Only | View Only | None |
| **Dashboard** | Full Overview | Sales Overview | Stock Overview | Audit Overview | Pending Notice |

---

## Pre-Seeded Test Credentials

All accounts are seeded with the password specified in `SEED_USER_PASSWORD` (default: `localTestPass123`):

| Role | Email Address | Description / Primary Access |
| :--- | :--- | :--- |
| **ADMIN** | `admin@minierp.local` | Full system access + User & Role Admin |
| **SALES** | `sales@minierp.local` | Customer CRM & Sales Challan creation/confirmation |
| **WAREHOUSE** | `warehouse@minierp.local` | Product catalog & manual stock adjustments |
| **ACCOUNTS** | `accounts@minierp.local` | Read-only audit access across all operational data |
| **USER** | `user@minierp.local` | Standard user (promoted to higher roles by Admin) |

> **Quick Logins**: The login screen provides 1-click quick login buttons for each test account.

---

## Path 1: Local Development (Without Docker)

### Prerequisites
- Node.js v20+ and npm v10+
- PostgreSQL 14+ running locally on port 5432

### Step-by-Step Setup

1. **Clone repository & install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   ```
   Ensure `DB_PASSWORD`, `JWT_SECRET`, and `SEED_USER_PASSWORD` are configured.

3. **Initialize Database & Seed Data**:
   ```bash
   # Generate Prisma Client
   npm run prisma:generate --workspace @mini-erp/api

   # Apply database schema
   npm run prisma:deploy --workspace @mini-erp/api

   # Seed demo accounts and sequence counters
   npm run db:seed --workspace @mini-erp/api
   ```

4. **Start Development Servers**:
   ```bash
   npm run dev
   ```

- **Web Portal**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3000/api](http://localhost:3000/api)
- **API Health**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## Path 2: Docker & Docker Compose

### Prerequisites
- Docker Engine & Docker Compose v2+ installed and running

### Step-by-Step Setup

1. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```

2. **Build and Start Containers**:
   ```bash
   # Using Make
   make up

   # Or using npm
   npm run docker:up

   # Or using Docker Compose directly
   docker compose up -d --build
   ```

3. **Run Migrations & Seed Inside the API Container**:
   ```bash
   # Apply migrations
   npm run docker:migrate
   # or: make migrate

   # Seed demo users
   npm run docker:seed
   # or: make seed
   ```

4. **Access Applications**:
   - **Frontend Web Portal**: [http://localhost:5173](http://localhost:5173)
   - **API Server**: [http://localhost:3000/api](http://localhost:3000/api)

5. **Useful Docker Commands**:
   ```bash
   # Stream logs for all services
   npm run docker:logs
   # or: make logs

   # Stream API logs
   npm run docker:logs:api

   # Stream Web logs
   npm run docker:logs:web

   # Stop all services
   npm run docker:down
   # or: make down
   ```

---

## API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/signup` - Register a new account (default role: `USER`).
- `POST /api/auth/login` - Authenticate with email & password, returns JWT token.
- `GET /api/auth/me` - Get profile for currently authenticated user.

### User & Role Administration (`/api/users`) *(ADMIN only)*
- `GET /api/users` - List all system users with role and activity counts.
- `POST /api/users` - Create a user with a specific role.
- `PATCH /api/users/:id/role` - Update a user's role (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`, `USER`).
- `DELETE /api/users/:id` - Remove a user (protected against self-deletion).

### Customers (`/api/customers`)
- `GET /api/customers` - List & search customers (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
- `POST /api/customers` - Create customer (`ADMIN`, `SALES`).
- `GET /api/customers/:id` - Customer timeline & details (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
- `PUT /api/customers/:id` - Update customer (`ADMIN`, `SALES`).
- `POST /api/customers/:id/follow-ups` - Add follow-up note (`ADMIN`, `SALES`).

### Products (`/api/products`)
- `GET /api/products` - List products with low stock filter and signed S3 image URLs (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
- `POST /api/products` - Create product (`ADMIN`, `WAREHOUSE`).
- `GET /api/products/:id` - Product details with signed S3 image URL (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
- `PUT /api/products/:id` - Update product attributes (`ADMIN`, `WAREHOUSE`).
- `POST /api/products/:id/image` - Upload product image to S3 (`ADMIN`, `WAREHOUSE`, max 5MB, JPG/PNG/WebP).
- `DELETE /api/products/:id/image` - Remove image from S3 (`ADMIN`, `WAREHOUSE`).
- `DELETE /api/products/:id` - Delete product and clean up S3 object (`ADMIN`).

### Inventory (`/api/inventory`)
- `GET /api/inventory/movements` - View audit log (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
- `POST /api/inventory/adjust` - Manual stock adjustment IN/OUT (`ADMIN`, `WAREHOUSE`).

### Sales Challans (`/api/challans`)
- `GET /api/challans` - List sales challans (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
- `POST /api/challans` - Create draft or confirmed challan (`ADMIN`, `SALES`).
- `GET /api/challans/:id` - View printable delivery challan (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
- `POST /api/challans/:id/confirm` - Confirm draft & deduct inventory atomically (`ADMIN`, `SALES`).
- `POST /api/challans/:id/cancel` - Cancel draft challan (`ADMIN`, `SALES`).

---

## AWS S3 Configuration

To enable cloud image storage in AWS S3, add the following variables to `.env`:

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-private-s3-bucket-name
AWS_ACCESS_KEY_ID=your-aws-iam-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-iam-secret-access-key
```

- **Bucket Access**: Recommended to keep the bucket private. The backend automatically generates secure short-lived (1-hour) signed URLs for image rendering.
- **Local Fallback**: If AWS variables are left blank, images fallback gracefully to data URIs for immediate local development without AWS credentials.

