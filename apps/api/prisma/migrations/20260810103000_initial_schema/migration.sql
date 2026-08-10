-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS');
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'WHOLESALE', 'DISTRIBUTOR');
CREATE TYPE "CustomerStatus" AS ENUM ('LEAD', 'ACTIVE', 'INACTIVE');
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT');
CREATE TYPE "ChallanStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'SALES',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "gstNumber" TEXT,
  "type" "CustomerType" NOT NULL,
  "status" "CustomerStatus" NOT NULL DEFAULT 'LEAD',
  "address" TEXT NOT NULL,
  "followUpDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerFollowUp" (
  "id" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "note" TEXT NOT NULL,
  "nextFollowUpDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Product" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "currentStock" INTEGER NOT NULL DEFAULT 0,
  "minimumStockAlertQuantity" INTEGER NOT NULL,
  "warehouseLocation" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesChallan" (
  "id" UUID NOT NULL,
  "challanNumber" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "totalQuantity" INTEGER NOT NULL DEFAULT 0,
  "status" "ChallanStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "SalesChallan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesChallanItem" (
  "id" UUID NOT NULL,
  "challanId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "productName" TEXT NOT NULL,
  "productSku" TEXT NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesChallanItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StockMovement" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "challanId" UUID,
  "quantity" INTEGER NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChallanSequence" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChallanSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_mobile_idx" ON "Customer"("mobile");
CREATE INDEX "Customer_status_followUpDate_idx" ON "Customer"("status", "followUpDate");
CREATE INDEX "CustomerFollowUp_customerId_createdAt_idx" ON "CustomerFollowUp"("customerId", "createdAt");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_currentStock_minimumStockAlertQuantity_idx" ON "Product"("currentStock", "minimumStockAlertQuantity");
CREATE UNIQUE INDEX "SalesChallan_challanNumber_key" ON "SalesChallan"("challanNumber");
CREATE INDEX "SalesChallan_customerId_createdAt_idx" ON "SalesChallan"("customerId", "createdAt");
CREATE INDEX "SalesChallan_status_createdAt_idx" ON "SalesChallan"("status", "createdAt");
CREATE INDEX "SalesChallanItem_challanId_idx" ON "SalesChallanItem"("challanId");
CREATE INDEX "SalesChallanItem_productId_idx" ON "SalesChallanItem"("productId");
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");
CREATE INDEX "StockMovement_challanId_idx" ON "StockMovement"("challanId");

-- AddForeignKey
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerFollowUp" ADD CONSTRAINT "CustomerFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "SalesChallan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesChallan" ADD CONSTRAINT "SalesChallan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesChallan" ADD CONSTRAINT "SalesChallan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesChallanItem" ADD CONSTRAINT "SalesChallanItem_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "SalesChallan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesChallanItem" ADD CONSTRAINT "SalesChallanItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
