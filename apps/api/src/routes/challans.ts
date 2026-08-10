import { Router } from 'express';
import { ChallanStatus, Prisma, Role, StockMovementType } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const challanRouter = Router();

// Protect all challan routes with authentication
challanRouter.use(authenticate);

const challanQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  status: z.nativeEnum(ChallanStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const challanItemInputSchema = z.object({
  productId: z.string().uuid('Valid product ID is required.'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1.'),
  unitPrice: z.coerce.number().positive().optional(),
});

const createChallanSchema = z.object({
  customerId: z.string().uuid('Valid customer ID is required.'),
  status: z
    .enum([ChallanStatus.DRAFT, ChallanStatus.CONFIRMED])
    .default(ChallanStatus.DRAFT),
  items: z.array(challanItemInputSchema).min(1, 'Challan must have at least one line item.'),
});

// Helper to generate sequential challan numbers atomically
async function generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const sequence = await tx.challanSequence.upsert({
    where: { id: 1 },
    update: { nextValue: { increment: 1 } },
    create: { id: 1, nextValue: 2 },
  });

  const seqNumber = sequence.nextValue - 1;
  const year = new Date().getFullYear();
  const padded = String(seqNumber).padStart(4, '0');
  return `CH-${year}-${padded}`;
}

// GET /api/challans - List sales challans with search and filters
challanRouter.get(
  '/',
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  async (req, res, next) => {
    try {
      const { customerId, status, search, page, limit } = challanQuerySchema.parse(req.query);
      const skip = (page - 1) * limit;

      const where: Prisma.SalesChallanWhereInput = {};

      if (customerId) {
        where.customerId = customerId;
      }

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { challanNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { customer: { businessName: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [total, challans] = await Promise.all([
        prisma.salesChallan.count({ where }),
        prisma.salesChallan.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: { id: true, name: true, businessName: true, mobile: true, email: true },
            },
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
            _count: {
              select: { items: true },
            },
          },
        }),
      ]);

      res.status(200).json({
        data: challans,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/challans - Create a new sales challan (Draft or Confirmed)
challanRouter.post(
  '/',
  authorize(Role.ADMIN, Role.SALES),
  async (req, res, next) => {
    try {
      const { customerId, status, items } = createChallanSchema.parse(req.body);

      const challan = await prisma.$transaction(async (tx) => {
        // 1. Verify customer exists
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
          throw new AppError(404, 'Customer not found.');
        }

        // 2. Fetch product records for snapshots and validation
        const productIds = items.map((i) => i.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        // Check if any product was missing
        for (const item of items) {
          if (!productMap.has(item.productId)) {
            throw new AppError(404, `Product with ID ${item.productId} was not found.`);
          }
        }

        // 3. If creating as CONFIRMED, check stock for all items (aggregated by product)
        if (status === ChallanStatus.CONFIRMED) {
          const requiredQuantityPerProduct = new Map<string, number>();
          for (const item of items) {
            const current = requiredQuantityPerProduct.get(item.productId) || 0;
            requiredQuantityPerProduct.set(item.productId, current + item.quantity);
          }

          for (const [productId, requiredQty] of requiredQuantityPerProduct.entries()) {
            const product = productMap.get(productId)!;
            if (product.currentStock < requiredQty) {
              throw new AppError(
                400,
                `Insufficient stock for "${product.name}" (${product.sku}). Available: ${product.currentStock}, Requested: ${requiredQty}.`,
              );
            }
          }
        }

        // 4. Generate unique sequential challan number
        const challanNumber = await generateChallanNumber(tx);
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

        // 5. Create Challan Header
        const createdChallan = await tx.salesChallan.create({
          data: {
            challanNumber,
            customerId,
            createdById: req.user!.userId,
            totalQuantity,
            status,
            confirmedAt: status === ChallanStatus.CONFIRMED ? new Date() : null,
          },
        });

        // 6. Create Challan Items with Snapshot Data
        const itemCreates = items.map((item) => {
          const product = productMap.get(item.productId)!;
          const unitPrice =
            item.unitPrice !== undefined
              ? new Prisma.Decimal(item.unitPrice)
              : product.unitPrice;

          return tx.salesChallanItem.create({
            data: {
              challanId: createdChallan.id,
              productId: item.productId,
              productName: product.name,
              productSku: product.sku,
              unitPrice,
              quantity: item.quantity,
            },
          });
        });

        await Promise.all(itemCreates);

        // 7. If CONFIRMED, deduct stock and record stock movements
        if (status === ChallanStatus.CONFIRMED) {
          for (const item of items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { currentStock: { decrement: item.quantity } },
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                createdById: req.user!.userId,
                challanId: createdChallan.id,
                quantity: item.quantity,
                type: StockMovementType.OUT,
                reason: `Sales Challan #${challanNumber} issued`,
              },
            });
          }
        }

        return createdChallan;
      });

      // Fetch full created challan with relations
      const fullChallan = await prisma.salesChallan.findUnique({
        where: { id: challan.id },
        include: {
          customer: true,
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          items: true,
        },
      });

      res.status(201).json({ challan: fullChallan });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/challans/:id - Detailed challan view with snapshot items and customer info
challanRouter.get(
  '/:id',
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;

      const challan = await prisma.salesChallan.findUnique({
        where: { id },
        include: {
          customer: true,
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          items: true,
          stockMovements: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      });

      if (!challan) {
        throw new AppError(404, 'Sales challan not found.');
      }

      res.status(200).json({ challan });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/challans/:id/confirm - Confirm a draft sales challan (Atomic Stock Deduction)
challanRouter.post(
  '/:id/confirm',
  authorize(Role.ADMIN, Role.SALES),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;

      const confirmedChallan = await prisma.$transaction(async (tx) => {
        const challan = await tx.salesChallan.findUnique({
          where: { id },
          include: { items: true },
        });

        if (!challan) {
          throw new AppError(404, 'Sales challan not found.');
        }

        if (challan.status === ChallanStatus.CONFIRMED) {
          throw new AppError(400, 'This sales challan has already been confirmed.');
        }

        if (challan.status === ChallanStatus.CANCELLED) {
          throw new AppError(400, 'Cannot confirm a cancelled sales challan.');
        }

        // Check stock availability for every line item (aggregated by product)
        const productIds = challan.items.map((i) => i.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        const requiredQuantityPerProduct = new Map<string, number>();
        for (const item of challan.items) {
          const current = requiredQuantityPerProduct.get(item.productId) || 0;
          requiredQuantityPerProduct.set(item.productId, current + item.quantity);
        }

        for (const [productId, requiredQty] of requiredQuantityPerProduct.entries()) {
          const product = productMap.get(productId);
          if (!product) {
            throw new AppError(404, 'One or more products in this challan no longer exist.');
          }
          if (product.currentStock < requiredQty) {
            throw new AppError(
              400,
              `Cannot confirm challan #${challan.challanNumber}: Insufficient stock for "${product.name}" (${product.sku}). Available: ${product.currentStock}, Required: ${requiredQty}.`,
            );
          }
        }

        // Deduct stock and create stock movements
        for (const item of challan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              createdById: req.user!.userId,
              challanId: challan.id,
              quantity: item.quantity,
              type: StockMovementType.OUT,
              reason: `Sales Challan #${challan.challanNumber} confirmation`,
            },
          });
        }

        // Update Challan status
        const updated = await tx.salesChallan.update({
          where: { id },
          data: {
            status: ChallanStatus.CONFIRMED,
            confirmedAt: new Date(),
          },
          include: {
            customer: true,
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
            items: true,
          },
        });

        return updated;
      });

      res.status(200).json({
        message: `Challan #${confirmedChallan.challanNumber} successfully confirmed and inventory deducted.`,
        challan: confirmedChallan,
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/challans/:id/cancel - Cancel a draft sales challan
challanRouter.post(
  '/:id/cancel',
  authorize(Role.ADMIN, Role.SALES),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;

      const challan = await prisma.salesChallan.findUnique({ where: { id } });
      if (!challan) {
        throw new AppError(404, 'Sales challan not found.');
      }

      if (challan.status !== ChallanStatus.DRAFT) {
        throw new AppError(400, `Cannot cancel a challan with status "${challan.status}".`);
      }

      const cancelled = await prisma.salesChallan.update({
        where: { id },
        data: {
          status: ChallanStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        include: {
          customer: true,
          items: true,
        },
      });

      res.status(200).json({
        message: `Challan #${cancelled.challanNumber} has been cancelled.`,
        challan: cancelled,
      });
    } catch (error) {
      next(error);
    }
  },
);
