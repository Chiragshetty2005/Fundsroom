# Mini ERP / CRM — Backend API Documentation

A production-ready RESTful API powering the Mini ERP and CRM Portal. Built with **Node.js 20**, **Express 5**, **TypeScript**, **Prisma 6 ORM**, **PostgreSQL 16**, and **AWS S3** for media storage.

---

## Table of Contents

1. [Backend Directory Structure](#1-backend-directory-structure)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Standard Error & Response Format](#3-standard-error--response-format)
4. [API Endpoints Reference](#4-api-endpoints-reference)
   - [Health & Diagnostics](#health--diagnostics)
   - [Authentication (`/api/auth`)](#authentication-apiauth)
   - [User Management (`/api/users`)](#user-management-apiusers)
   - [CRM & Customers (`/api/customers`)](#crm--customers-apicustomers)
   - [Products & S3 Media (`/api/products`)](#products--s3-media-apiproducts)
   - [Inventory & Stock Ledger (`/api/inventory`)](#inventory--stock-ledger-apiinventory)
   - [Sales Challans / Dispatch (`/api/challans`)](#sales-challans--dispatch-apichallans)
5. [Data Models & Enums](#5-data-models--enums)
6. [Environment Variables](#6-environment-variables)
7. [Running Locally & Commands](#7-running-locally--commands)

---

## 1. Backend Directory Structure

```
apps/api/
├── .env.example              # Environment variables template
├── create-users.js           # Standalone direct user creation utility
├── Dockerfile                # Multi-stage production container build
├── package.json              # Dependencies, workspace scripts, and metadata
├── prisma.config.ts          # Prisma v6 CLI configuration
├── tsconfig.json             # TypeScript compiler options (ESNext, strict)
├── prisma/
│   ├── schema.prisma         # Prisma PostgreSQL schema definition & models
│   ├── seed.ts               # Database seeder for demo users & sequences
│   └── migrations/           # Versioned SQL migration history
│       ├── 20260810103000_initial_schema/
│       ├── 20260811120000_add_user_role_enum/
│       ├── 20260811120100_set_default_role_user/
│       ├── 20260811130000_add_product_image_url/
│       └── migration_lock.toml
└── src/
    ├── app.ts                # Express app initialization, CORS, cookie-parser & route bindings
    ├── server.ts             # Server entry point, database connection & graceful shutdown
    ├── config/
    │   ├── database.ts       # PostgreSQL connection parsing & fallback URL generation
    │   └── env.ts            # Zod validation schema for runtime environment variables
    ├── lib/
    │   ├── jwt.ts            # JWT signing (8h expiration) & verification utilities
    │   ├── prisma.ts         # Singleton Prisma Client instance with logging
    │   └── s3.ts             # AWS S3 client, pre-signed GET URLs & upload/delete helpers
    ├── middleware/
    │   ├── authenticate.ts   # JWT authentication via HttpOnly cookies & Bearer fallback
    │   ├── authorize.ts      # Role-Based Access Control (RBAC) middleware
    │   └── error-handler.ts  # Centralized error handler (Zod, Prisma, AppError, 404)
    ├── routes/
    │   ├── auth.ts           # Sign up, login, logout, and me endpoints
    │   ├── challans.ts       # Sales challan management & atomic inventory deductions
    │   ├── customers.ts      # Customer CRM and timeline follow-ups
    │   ├── health.ts         # Health checks & database ping
    │   ├── inventory.ts      # Manual stock adjustments & inventory movement audit ledger
    │   ├── products.ts       # Product master catalog & S3 image uploads
    │   └── users.ts          # Administrator user management & role assignment
    └── types/
        └── express.d.ts      # Express Request type extensions for authenticated user
```

---

## 2. Authentication & Authorization

### Authentication Flow
- **HttpOnly Cookies**: Session tokens are issued in an `HttpOnly`, `SameSite=Lax`, `Path=/`, `8-hour` expiration cookie named `auth_token`.
- **Bearer Header Fallback**: The `authenticate` middleware also accepts `Authorization: Bearer <token>` for external API clients, testing tools, and cURL requests.
- **CORS Credentials**: Configured with `credentials: true` matching `CLIENT_ORIGIN` (`http://localhost:5173`).

### Role-Based Access Control (RBAC)

The system enforces 5 distinct roles:
1. **`ADMIN`**: Full platform access (User management, CRM, Products, Inventory, Challans).
2. **`SALES`**: CRM Customers, Customer Follow-ups, Product viewing, Sales Challan Creation & Confirmation.
3. **`WAREHOUSE`**: Product Management, S3 Image Uploads, Manual Stock Adjustments, Inventory Ledger, Challan Viewing.
4. **`ACCOUNTS`**: Read-only access across CRM, Products, Inventory, and Sales Challans for audit and financial tracking.
5. **`USER`**: Default role for new signups; restricted to own profile until elevated by an Administrator.

---

## 3. Standard Error & Response Format

### Success Response
```json
{
  "message": "Operation successful.",
  "data": { ... }
}
```

### Paginated Response
```json
{
  "data": [ ... ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### Validation Error (`400 Bad Request`)
```json
{
  "error": {
    "message": "Validation failed.",
    "details": [
      {
        "field": "email",
        "message": "Valid email is required."
      }
    ]
  }
}
```

### Unauthorized Error (`401 Unauthorized`)
```json
{
  "error": {
    "message": "Authentication required. Please sign in."
  }
}
```

### Forbidden Error (`403 Forbidden`)
```json
{
  "error": {
    "message": "Insufficient permissions."
  }
}
```

### Conflict Error (`409 Conflict`)
```json
{
  "error": {
    "message": "A record with this SKU already exists."
  }
}
```

---

## 4. API Endpoints Reference

### Health & Diagnostics

#### 1. Root Service Ping
- **Method**: `GET`
- **Path**: `/`
- **Auth**: Public
- **Description**: Lightweight health check confirming server is reachable.
- **Response**: `200 OK`
  ```json
  {
    "message": "Server up and running...."
  }
  ```

#### 2. Deep Health & Database Check
- **Method**: `GET`
- **Path**: `/api/health`
- **Auth**: Public
- **Description**: Executes `SELECT 1` on PostgreSQL to verify active database connectivity.
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-08-12T08:00:00.000Z"
  }
  ```
- **Error Response**: `503 Service Unavailable` if database is unreachable.

---

### Authentication (`/api/auth`)

#### 1. User Signup / Registration
- **Method**: `POST`
- **Path**: `/api/auth/signup`
- **Auth**: Public
- **Description**: Creates a new user account with default `USER` role and sets the `auth_token` HttpOnly cookie.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@company.com",
    "password": "Password123!"
  }
  ```
- **Response**: `201 Created` + `Set-Cookie: auth_token=...`
  ```json
  {
    "message": "Account created successfully.",
    "user": {
      "id": "c1f6b5b0-8c29-4d22-95b8-5c4d1e2f3a4b",
      "name": "Jane Doe",
      "email": "jane@company.com",
      "role": "USER"
    }
  }
  ```

#### 2. User Login
- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Auth**: Public
- **Description**: Verifies email and password, signs a JWT (8h), sets the `auth_token` HttpOnly cookie, and returns user details.
- **Request Body**:
  ```json
  {
    "email": "admin@minierp.local",
    "password": "localTestPass123"
  }
  ```
- **Response**: `200 OK` + `Set-Cookie: auth_token=...`
  ```json
  {
    "message": "Signed in successfully.",
    "user": {
      "id": "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a",
      "name": "Admin User",
      "email": "admin@minierp.local",
      "role": "ADMIN"
    }
  }
  ```

#### 3. User Logout
- **Method**: `POST`
- **Path**: `/api/auth/logout`
- **Auth**: Public
- **Description**: Clears the `auth_token` HttpOnly cookie from the client browser.
- **Response**: `200 OK` + `Set-Cookie: auth_token=; Max-Age=0`
  ```json
  {
    "message": "Logged out successfully."
  }
  ```

#### 4. Current User Profile
- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Auth**: Required (`auth_token` cookie or Bearer token)
- **Description**: Fetches the profile of the currently authenticated user.
- **Response**: `200 OK`
  ```json
  {
    "user": {
      "id": "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a",
      "name": "Admin User",
      "email": "admin@minierp.local",
      "role": "ADMIN"
    }
  }
  ```

---

### User Management (`/api/users`)
> *All user routes require `ADMIN` role.*

#### 1. List All Users
- **Method**: `GET`
- **Path**: `/api/users`
- **Auth**: `ADMIN`
- **Description**: Lists all registered users with relational activity counts (follow-ups, challans, stock movements).
- **Response**: `200 OK`
  ```json
  {
    "data": [
      {
        "id": "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a",
        "name": "Admin User",
        "email": "admin@minierp.local",
        "role": "ADMIN",
        "createdAt": "2026-08-10T10:30:00.000Z",
        "updatedAt": "2026-08-10T10:30:00.000Z",
        "_count": {
          "createdFollowUps": 5,
          "createdChallans": 12,
          "stockMovements": 8
        }
      }
    ]
  }
  ```

#### 2. Create User With Role
- **Method**: `POST`
- **Path**: `/api/users`
- **Auth**: `ADMIN`
- **Description**: Creates a user with a specific pre-assigned role (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`, `USER`).
- **Request Body**:
  ```json
  {
    "name": "Sales Rep",
    "email": "rep@minierp.local",
    "password": "Password123!",
    "role": "SALES"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "message": "User created successfully.",
    "user": {
      "id": "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b",
      "name": "Sales Rep",
      "email": "rep@minierp.local",
      "role": "SALES",
      "createdAt": "2026-08-12T08:15:00.000Z"
    }
  }
  ```

#### 3. Update User Role
- **Method**: `PATCH`
- **Path**: `/api/users/:id/role`
- **Auth**: `ADMIN`
- **Description**: Modifies a user's operational role. Safeguarded against demoting the sole remaining administrator.
- **Request Body**:
  ```json
  {
    "role": "WAREHOUSE"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "Role for Sales Rep updated to WAREHOUSE.",
    "user": {
      "id": "e3f4a5b6-c7d8-9e0f-1a2b-3c4d5e6f7a8b",
      "name": "Sales Rep",
      "email": "rep@minierp.local",
      "role": "WAREHOUSE",
      "updatedAt": "2026-08-12T08:20:00.000Z"
    }
  }
  ```

#### 4. Delete User
- **Method**: `DELETE`
- **Path**: `/api/users/:id`
- **Auth**: `ADMIN`
- **Description**: Deletes a user account. Safeguarded against self-deletion and deleting accounts with audit ledger history.
- **Response**: `200 OK`
  ```json
  {
    "message": "User Sales Rep has been removed."
  }
  ```

---

### CRM & Customers (`/api/customers`)
> *Accessible by: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS` (Write actions: `ADMIN`, `SALES`)*

#### 1. List Customers
- **Method**: `GET`
- **Path**: `/api/customers`
- **Auth**: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`
- **Query Parameters**:
  - `search` *(optional)*: Search customer name, business name, mobile, or email.
  - `status` *(optional)*: `LEAD`, `ACTIVE`, `INACTIVE`.
  - `type` *(optional)*: `RETAIL`, `WHOLESALE`, `DISTRIBUTOR`.
  - `page` *(optional, default: 1)*: Page number.
  - `limit` *(optional, default: 20, max: 100)*: Items per page.
- **Response**: `200 OK`
  ```json
  {
    "data": [
      {
        "id": "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
        "name": "John Doe",
        "mobile": "+919876543210",
        "email": "john@acme.com",
        "businessName": "Acme Retailers",
        "gstNumber": "27AABCU9603R1ZM",
        "type": "WHOLESALE",
        "status": "ACTIVE",
        "address": "101 Industrial Estate, Mumbai",
        "followUpDate": "2026-08-15T10:00:00.000Z",
        "notes": "Prefers bulk delivery on Mondays",
        "createdAt": "2026-08-11T09:00:00.000Z",
        "updatedAt": "2026-08-11T09:00:00.000Z",
        "_count": {
          "followUps": 3,
          "challans": 2
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

#### 2. Create Customer
- **Method**: `POST`
- **Path**: `/api/customers`
- **Auth**: `ADMIN`, `SALES`
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "mobile": "+919876543210",
    "email": "john@acme.com",
    "businessName": "Acme Retailers",
    "gstNumber": "27AABCU9603R1ZM",
    "type": "WHOLESALE",
    "status": "ACTIVE",
    "address": "101 Industrial Estate, Mumbai",
    "followUpDate": "2026-08-15T10:00:00Z",
    "notes": "Initial contact made via trade expo"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "customer": {
      "id": "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
      "name": "John Doe",
      ...
    }
  }
  ```

#### 3. View Customer Detail
- **Method**: `GET`
- **Path**: `/api/customers/:id`
- **Auth**: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`
- **Description**: Returns customer profile with complete chronological follow-up timeline and recent sales challans.
- **Response**: `200 OK`
  ```json
  {
    "customer": {
      "id": "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
      "name": "John Doe",
      "followUps": [
        {
          "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "note": "Discussed Q3 pricing tier.",
          "nextFollowUpDate": "2026-08-20T10:00:00.000Z",
          "createdAt": "2026-08-12T07:30:00.000Z",
          "createdBy": {
            "id": "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a",
            "name": "Sales Rep",
            "email": "sales@minierp.local",
            "role": "SALES"
          }
        }
      ],
      "challans": [ ... ]
    }
  }
  ```

#### 4. Update Customer
- **Method**: `PUT`
- **Path**: `/api/customers/:id`
- **Auth**: `ADMIN`, `SALES`
- **Request Body**: *(Partial update supported)*
  ```json
  {
    "status": "ACTIVE",
    "address": "202 New Commercial Hub, Mumbai"
  }
  ```
- **Response**: `200 OK`

#### 5. Add Customer Follow-up
- **Method**: `POST`
- **Path**: `/api/customers/:id/follow-ups`
- **Auth**: `ADMIN`, `SALES`
- **Description**: Records a follow-up interaction and atomically updates the customer's next scheduled follow-up date.
- **Request Body**:
  ```json
  {
    "note": "Called client regarding payment confirmation.",
    "nextFollowUpDate": "2026-08-18T14:00:00Z"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "followUp": {
      "id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
      "customerId": "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
      "note": "Called client regarding payment confirmation.",
      "nextFollowUpDate": "2026-08-18T14:00:00.000Z",
      "createdAt": "2026-08-12T08:30:00.000Z",
      "createdBy": {
        "id": "...",
        "name": "Sales Rep",
        "email": "sales@minierp.local",
        "role": "SALES"
      }
    }
  }
  ```

---

### Products & S3 Media (`/api/products`)
> *Accessible by: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS` (Write actions: `ADMIN`, `WAREHOUSE`)*

#### 1. List Products
- **Method**: `GET`
- **Path**: `/api/products`
- **Auth**: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`
- **Query Parameters**:
  - `search` *(optional)*: Matches Product name, SKU, or warehouse location.
  - `category` *(optional)*: Filter by exact category.
  - `lowStock` *(optional, `true`/`false`)*: Filter products where `currentStock <= minimumStockAlertQuantity`.
  - `page` *(optional, default: 1)*
  - `limit` *(optional, default: 20, max: 100)*
- **Response**: `200 OK` *(Generates AWS S3 pre-signed URLs valid for 1 hour)*
  ```json
  {
    "data": [
      {
        "id": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
        "name": "Industrial Ball Bearing 6204",
        "sku": "BRG-6204",
        "category": "Bearings",
        "unitPrice": "240.00",
        "currentStock": 45,
        "minimumStockAlertQuantity": 10,
        "warehouseLocation": "Rack B-12",
        "imageUrl": "https://s3.eu-north-1.amazonaws.com/my-bucket/products/...?AWSAccessKeyId=...",
        "isLowStock": false,
        "createdAt": "2026-08-10T12:00:00.000Z",
        "updatedAt": "2026-08-10T12:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

#### 2. Create Product Master
- **Method**: `POST`
- **Path**: `/api/products`
- **Auth**: `ADMIN`, `WAREHOUSE`
- **Description**: Creates product master record. If `initialStock > 0`, atomically records an initial `IN` stock movement in the audit ledger.
- **Request Body**:
  ```json
  {
    "name": "Industrial Ball Bearing 6204",
    "sku": "BRG-6204",
    "category": "Bearings",
    "unitPrice": 240.00,
    "initialStock": 50,
    "minimumStockAlertQuantity": 10,
    "warehouseLocation": "Rack B-12"
  }
  ```
- **Response**: `201 Created`

#### 3. View Product Detail
- **Method**: `GET`
- **Path**: `/api/products/:id`
- **Auth**: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`
- **Description**: Returns product details with recent 10 inventory stock movement records.
- **Response**: `200 OK`

#### 4. Update Product
- **Method**: `PUT`
- **Path**: `/api/products/:id`
- **Auth**: `ADMIN`, `WAREHOUSE`
- **Request Body**:
  ```json
  {
    "unitPrice": 255.00,
    "minimumStockAlertQuantity": 15,
    "warehouseLocation": "Rack B-14"
  }
  ```
- **Response**: `200 OK`

#### 5. Upload Product Image to AWS S3
- **Method**: `POST`
- **Path**: `/api/products/:id/image`
- **Auth**: `ADMIN`, `WAREHOUSE`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `image`: File buffer (`.jpg`, `.jpeg`, `.png`, `.webp`, max size: **5MB**).
- **Description**: Uploads image buffer directly to AWS S3 bucket (`products/{productId}/{uuid}.{ext}`). Automatically removes previous S3 object to prevent orphaned storage. (Falls back to base64 data URI in local dev without S3).
- **Response**: `200 OK`
  ```json
  {
    "message": "Product image uploaded successfully.",
    "product": {
      "id": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
      "imageUrl": "https://s3.eu-north-1.amazonaws.com/...",
      "isLowStock": false
    }
  }
  ```

#### 6. Delete Product Image
- **Method**: `DELETE`
- **Path**: `/api/products/:id/image`
- **Auth**: `ADMIN`, `WAREHOUSE`
- **Description**: Deletes the image from S3 and sets `imageUrl = null` in the database.
- **Response**: `200 OK`

#### 7. Delete Product Master
- **Method**: `DELETE`
- **Path**: `/api/products/:id`
- **Auth**: `ADMIN`
- **Description**: Deletes product master record and associated S3 image. Fails safely if product has recorded sales challans or stock movements.
- **Response**: `200 OK`

---

### Inventory & Stock Ledger (`/api/inventory`)
> *Accessible by: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS` (Adjustment write actions: `ADMIN`, `WAREHOUSE`)*

#### 1. View Stock Movement Audit Log
- **Method**: `GET`
- **Path**: `/api/inventory/movements`
- **Auth**: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`
- **Query Parameters**:
  - `productId` *(optional, UUID)*: Filter movements for a specific product.
  - `type` *(optional)*: `IN` or `OUT`.
  - `page` *(optional, default: 1)*
  - `limit` *(optional, default: 20, max: 100)*
- **Response**: `200 OK`
  ```json
  {
    "data": [
      {
        "id": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
        "productId": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
        "quantity": 10,
        "type": "OUT",
        "reason": "Sales Challan #CH-2026-0001 confirmation",
        "createdAt": "2026-08-12T08:40:00.000Z",
        "product": {
          "id": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
          "name": "Industrial Ball Bearing 6204",
          "sku": "BRG-6204",
          "category": "Bearings"
        },
        "createdBy": {
          "id": "d2e3f4a5-b6c7-8d9e-0f1a-2b3c4d5e6f7a",
          "name": "Warehouse Manager",
          "email": "warehouse@minierp.local",
          "role": "WAREHOUSE"
        },
        "challan": {
          "id": "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
          "challanNumber": "CH-2026-0001",
          "status": "CONFIRMED"
        }
      }
    ],
    "pagination": { ... }
  }
  ```

#### 2. Manual Stock Adjustment
- **Method**: `POST`
- **Path**: `/api/inventory/adjust`
- **Auth**: `ADMIN`, `WAREHOUSE`
- **Description**: Atomically increments or decrements warehouse stock and writes an immutable audit record to `StockMovement`.
- **Request Body**:
  ```json
  {
    "productId": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
    "quantity": 25,
    "type": "IN",
    "reason": "Supplier shipment received (PO #9921)"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "message": "Successfully adjusted stock (IN 25 units).",
    "product": {
      "id": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
      "name": "Industrial Ball Bearing 6204",
      "currentStock": 70,
      "minimumStockAlertQuantity": 10,
      "isLowStock": false
    },
    "movement": { ... }
  }
  ```

---

### Sales Challans / Dispatch (`/api/challans`)
> *Accessible by: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS` (Creation/Confirmation/Cancellation: `ADMIN`, `SALES`)*

#### 1. List Sales Challans
- **Method**: `GET`
- **Path**: `/api/challans`
- **Auth**: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`
- **Query Parameters**:
  - `search` *(optional)*: Search challan number, customer name, or business name.
  - `status` *(optional)*: `DRAFT`, `CONFIRMED`, `CANCELLED`.
  - `customerId` *(optional, UUID)*: Filter by customer.
  - `page` *(optional, default: 1)*
  - `limit` *(optional, default: 20)*
- **Response**: `200 OK`

#### 2. Create Sales Challan
- **Method**: `POST`
- **Path**: `/api/challans`
- **Auth**: `ADMIN`, `SALES`
- **Description**: Creates a new Sales Challan with snapshot line items (`productName`, `productSku`, `unitPrice`, `quantity`).
  - If status is `DRAFT`: Creates document without touching inventory stock.
  - If status is `CONFIRMED`: Validates stock availability, atomically decrements warehouse inventory, creates `StockMovement` records, and marks challan as confirmed.
- **Request Body**:
  ```json
  {
    "customerId": "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
    "status": "DRAFT",
    "items": [
      {
        "productId": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
        "quantity": 10,
        "unitPrice": 240.00
      }
    ]
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "challan": {
      "id": "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
      "challanNumber": "CH-2026-0001",
      "customerId": "f4a5b6c7-d8e9-0f1a-2b3c-4d5e6f7a8b9c",
      "totalQuantity": 10,
      "status": "DRAFT",
      "createdAt": "2026-08-12T08:50:00.000Z",
      "confirmedAt": null,
      "cancelledAt": null,
      "customer": { ... },
      "items": [
        {
          "id": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
          "productName": "Industrial Ball Bearing 6204",
          "productSku": "BRG-6204",
          "unitPrice": "240.00",
          "quantity": 10
        }
      ]
    }
  }
  ```

#### 3. View Challan Detail
- **Method**: `GET`
- **Path**: `/api/challans/:id`
- **Auth**: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`
- **Description**: Returns detailed sales challan with immutable line item snapshots, customer details, and linked stock movement records.
- **Response**: `200 OK`

#### 4. Confirm Draft Challan (Inventory Deduction)
- **Method**: `POST`
- **Path**: `/api/challans/:id/confirm`
- **Auth**: `ADMIN`, `SALES`
- **Description**: Transitions a `DRAFT` challan to `CONFIRMED`.
  - Executes inside a database transaction (`prisma.$transaction`).
  - Verifies current stock for all items.
  - Decrements `currentStock` on each product.
  - Inserts `StockMovement` (`OUT`, `Sales Challan #CH-YYYY-XXXX confirmation`).
  - Sets `confirmedAt = NOW()`.
- **Response**: `200 OK`
  ```json
  {
    "message": "Challan #CH-2026-0001 successfully confirmed and inventory deducted.",
    "challan": { ... }
  }
  ```
- **Error Response**: `400 Bad Request` if available stock is insufficient.

#### 5. Cancel Draft Challan
- **Method**: `POST`
- **Path**: `/api/challans/:id/cancel`
- **Auth**: `ADMIN`, `SALES`
- **Description**: Marks a `DRAFT` challan as `CANCELLED`. Confirmed challans cannot be cancelled to preserve inventory ledger integrity.
- **Response**: `200 OK`

---

## 5. Data Models & Enums

### Enums
- **`Role`**: `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`, `USER`
- **`CustomerType`**: `RETAIL`, `WHOLESALE`, `DISTRIBUTOR`
- **`CustomerStatus`**: `LEAD`, `ACTIVE`, `INACTIVE`
- **`StockMovementType`**: `IN`, `OUT`
- **`ChallanStatus`**: `DRAFT`, `CONFIRMED`, `CANCELLED`

### Key Models Overview
| Model | Primary Key | Key Relations | Indexes |
| :--- | :--- | :--- | :--- |
| **`User`** | UUID | Follow-ups, Challans, Stock Movements | `email` (unique) |
| **`Customer`** | UUID | Follow-ups (Cascade), Challans | `name`, `mobile`, `(status, followUpDate)` |
| **`CustomerFollowUp`**| UUID | Customer, CreatedBy (User) | `(customerId, createdAt)` |
| **`Product`** | UUID | StockMovements, ChallanItems | `sku` (unique), `name`, `category`, `(currentStock, minimumStockAlertQuantity)` |
| **`StockMovement`** | UUID | Product, CreatedBy (User), Challan (Optional) | `(productId, createdAt)`, `challanId` |
| **`SalesChallan`** | UUID | Customer, CreatedBy (User), Items, StockMovements | `challanNumber` (unique), `(customerId, createdAt)`, `(status, createdAt)` |
| **`SalesChallanItem`** | UUID | Challan (Cascade), Product (Restrict) | `challanId`, `productId` |
| **`ChallanSequence`** | Int (1) | Atomic sequence counter for `CH-YYYY-XXXX` | — |

---

## 6. Environment Variables

Configure these in `apps/api/.env` or Docker Compose:

```env
# Application Server
NODE_ENV=development
PORT=3000
CLIENT_ORIGIN=http://localhost:5173

# Security & JWT
JWT_SECRET=my-super-secret-jwt-key-for-dev-1234
SEED_USER_PASSWORD=localTestPass123

# PostgreSQL Database Connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mini_erp
DB_USER=mini_erp_app
DB_PASSWORD=postgres123
DB_SCHEMA=public
DATABASE_URL=postgresql://mini_erp_app:postgres123@localhost:5432/mini_erp?schema=public

# AWS S3 Storage (Optional for local dev; data URI fallback enabled)
AWS_REGION=us-east-1
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

---

## 7. Running Locally & Commands

```bash
# 1. Install Monorepo Dependencies
npm ci

# 2. Generate Prisma Client
npm run prisma:generate --workspace=@mini-erp/api

# 3. Start PostgreSQL with Docker
docker compose up -d postgres

# 4. Apply Database Migrations
npm run prisma:deploy --workspace=@mini-erp/api

# 5. Seed Initial Users and Sequences
npm run db:seed --workspace=@mini-erp/api

# 6. Run API in Development Mode (Live reload with tsx)
npm run dev --workspace=@mini-erp/api

# 7. Typecheck & Build API
npm run check --workspace=@mini-erp/api
npm run build --workspace=@mini-erp/api
```
