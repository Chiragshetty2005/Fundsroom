import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const productRouter = Router();

// Protect all product routes with authentication
productRouter.use(authenticate);

const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required.'),
  sku: z.string().trim().min(1, 'SKU is required.').toUpperCase(),
  category: z.string().trim().min(1, 'Category is required.'),
  unitPrice: z.coerce.number().positive('Unit price must be a positive number.'),
  initialStock: z.coerce.number().int().min(0, 'Initial stock cannot be negative.').default(0),
  minimumStockAlertQuantity: z.coerce
    .number()
    .int()
    .min(0, 'Minimum stock alert quantity cannot be negative.')
    .default(5),
  warehouseLocation: z.string().trim().min(1, 'Warehouse location is required.'),
});

const updateProductSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  unitPrice: z.coerce.number().positive().optional(),
  minimumStockAlertQuantity: z.coerce.number().int().min(0).optional(),
  warehouseLocation: z.string().trim().min(1).optional(),
});

// GET /api/products - List products with search, category filtering, low stock alerts, and pagination
productRouter.get(
  '/',
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  async (req, res, next) => {
    try {
      const { search, category, lowStock, page, limit } = productQuerySchema.parse(req.query);
      const skip = (page - 1) * limit;

      const where: Prisma.ProductWhereInput = {};

      if (category) {
        where.category = { equals: category, mode: 'insensitive' };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { warehouseLocation: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (lowStock) {
        // If low stock filter is active, fetch products where currentStock <= minimumStockAlertQuantity
        const rawProducts = await prisma.$queryRaw<
          Array<{
            id: string;
            name: string;
            sku: string;
            category: string;
            unitPrice: Prisma.Decimal;
            currentStock: number;
            minimumStockAlertQuantity: number;
            warehouseLocation: string;
            createdAt: Date;
            updatedAt: Date;
          }>
        >`
          SELECT * FROM "Product"
          WHERE "currentStock" <= "minimumStockAlertQuantity"
          ${search ? Prisma.sql`AND ("name" ILIKE ${`%${search}%`} OR "sku" ILIKE ${`%${search}%`} OR "category" ILIKE ${`%${search}%`})` : Prisma.empty}
          ${category ? Prisma.sql`AND "category" ILIKE ${category}` : Prisma.empty}
          ORDER BY "currentStock" ASC, "name" ASC
          LIMIT ${limit} OFFSET ${skip}
        `;

        const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count FROM "Product"
          WHERE "currentStock" <= "minimumStockAlertQuantity"
          ${search ? Prisma.sql`AND ("name" ILIKE ${`%${search}%`} OR "sku" ILIKE ${`%${search}%`} OR "category" ILIKE ${`%${search}%`})` : Prisma.empty}
          ${category ? Prisma.sql`AND "category" ILIKE ${category}` : Prisma.empty}
        `;

        const total = Number(countResult[0]?.count ?? 0);

        res.status(200).json({
          data: rawProducts.map((p) => ({
            ...p,
            isLowStock: p.currentStock <= p.minimumStockAlertQuantity,
          })),
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          },
        });
        return;
      }

      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
      ]);

      res.status(200).json({
        data: products.map((p) => ({
          ...p,
          isLowStock: p.currentStock <= p.minimumStockAlertQuantity,
        })),
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

// POST /api/products - Create a new product (Admin and Warehouse only)
productRouter.post(
  '/',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  async (req, res, next) => {
    try {
      const data = createProductSchema.parse(req.body);

      const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (existing) {
        throw new AppError(409, `Product with SKU "${data.sku}" already exists.`);
      }

      const product = await prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            name: data.name,
            sku: data.sku,
            category: data.category,
            unitPrice: new Prisma.Decimal(data.unitPrice),
            currentStock: data.initialStock,
            minimumStockAlertQuantity: data.minimumStockAlertQuantity,
            warehouseLocation: data.warehouseLocation,
          },
        });

        if (data.initialStock > 0) {
          await tx.stockMovement.create({
            data: {
              productId: created.id,
              createdById: req.user!.userId,
              quantity: data.initialStock,
              type: 'IN',
              reason: 'Initial stock intake upon product creation',
            },
          });
        }

        return created;
      });

      res.status(201).json({
        product: {
          ...product,
          isLowStock: product.currentStock <= product.minimumStockAlertQuantity,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/products/:id - Product details
productRouter.get(
  '/:id',
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          stockMovements: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              createdBy: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
        },
      });

      if (!product) {
        throw new AppError(404, 'Product not found.');
      }

      res.status(200).json({
        product: {
          ...product,
          isLowStock: product.currentStock <= product.minimumStockAlertQuantity,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/products/:id - Update product master attributes
productRouter.put(
  '/:id',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const data = updateProductSchema.parse(req.body);

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, 'Product not found.');
      }

      const updated = await prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          category: data.category,
          unitPrice: data.unitPrice !== undefined ? new Prisma.Decimal(data.unitPrice) : undefined,
          minimumStockAlertQuantity: data.minimumStockAlertQuantity,
          warehouseLocation: data.warehouseLocation,
        },
      });

      res.status(200).json({
        product: {
          ...updated,
          isLowStock: updated.currentStock <= updated.minimumStockAlertQuantity,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
