import { Router } from 'express';
import { Prisma, Role, StockMovementType } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const inventoryRouter = Router();

// Protect all inventory routes with authentication
inventoryRouter.use(authenticate);

const movementQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  type: z.nativeEnum(StockMovementType).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const adjustStockSchema = z.object({
  productId: z.string().uuid('Valid product ID is required.'),
  quantity: z.coerce.number().int().positive('Quantity must be a positive integer.'),
  type: z.nativeEnum(StockMovementType),
  reason: z.string().trim().min(3, 'Adjustment reason must be at least 3 characters.'),
});

// GET /api/inventory/movements - View stock movement audit log
inventoryRouter.get(
  '/movements',
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  async (req, res, next) => {
    try {
      const { productId, type, page, limit } = movementQuerySchema.parse(req.query);
      const skip = (page - 1) * limit;

      const where: Prisma.StockMovementWhereInput = {};

      if (productId) {
        where.productId = productId;
      }

      if (type) {
        where.type = type;
      }

      const [total, movements] = await Promise.all([
        prisma.stockMovement.count({ where }),
        prisma.stockMovement.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              select: { id: true, name: true, sku: true, category: true },
            },
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
            challan: {
              select: { id: true, challanNumber: true, status: true },
            },
          },
        }),
      ]);

      res.status(200).json({
        data: movements,
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

// POST /api/inventory/adjust - Manual stock adjustment (Warehouse and Admin only)
inventoryRouter.post(
  '/adjust',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  async (req, res, next) => {
    try {
      const { productId, quantity, type, reason } = adjustStockSchema.parse(req.body);

      const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { id: productId } });

        if (!product) {
          throw new AppError(404, 'Product not found.');
        }

        if (type === StockMovementType.OUT && product.currentStock < quantity) {
          throw new AppError(
            400,
            `Insufficient stock for "${product.name}" (${product.sku}). Available: ${product.currentStock}, Requested deduction: ${quantity}.`,
          );
        }

        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: {
            currentStock:
              type === StockMovementType.IN
                ? { increment: quantity }
                : { decrement: quantity },
          },
        });

        const movement = await tx.stockMovement.create({
          data: {
            productId,
            createdById: req.user!.userId,
            quantity,
            type,
            reason,
          },
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        return { product: updatedProduct, movement };
      });

      res.status(201).json({
        message: `Successfully adjusted stock (${type} ${quantity} units).`,
        product: {
          ...result.product,
          isLowStock: result.product.currentStock <= result.product.minimumStockAlertQuantity,
        },
        movement: result.movement,
      });
    } catch (error) {
      next(error);
    }
  },
);
