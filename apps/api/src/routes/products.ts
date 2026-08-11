import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import multer from 'multer';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import {
  attachSignedProductImages,
  attachSignedProductImageUrl,
  deleteProductImage,
  uploadProductImage,
} from '../lib/s3.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const productRouter = Router();

// Protect all product routes with authentication
productRouter.use(authenticate);

// Configure Multer with in-memory storage, 5MB limit, and JPG/PNG/WebP validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          400,
          `Invalid file format (${file.mimetype}). Only JPG, PNG, and WebP images are permitted.`,
        ),
      );
    }
  },
});

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
  imageUrl: z.string().optional().nullable(),
});

const updateProductSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  unitPrice: z.coerce.number().positive().optional(),
  minimumStockAlertQuantity: z.coerce.number().int().min(0).optional(),
  warehouseLocation: z.string().trim().min(1).optional(),
  imageUrl: z.string().optional().nullable(),
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
          { warehouseLocation: { contains: search, mode: 'insensitive' } },
        ];
      }

      let [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      if (lowStock) {
        products = products.filter((p) => p.currentStock <= p.minimumStockAlertQuantity);
      }

      // Attach signed image URLs for private S3 buckets
      const productsWithUrls = await attachSignedProductImages(products);

      res.status(200).json({
        data: productsWithUrls.map((p) => ({
          ...p,
          isLowStock: p.currentStock <= p.minimumStockAlertQuantity,
        })),
        pagination: {
          total: lowStock ? products.length : total,
          page,
          limit,
          totalPages: Math.ceil((lowStock ? products.length : total) / limit) || 1,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/products - Create a new product master record
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
            imageUrl: data.imageUrl || null,
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

      const productWithUrl = await attachSignedProductImageUrl(product);

      res.status(201).json({
        product: {
          ...productWithUrl,
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

      const productWithUrl = await attachSignedProductImageUrl(product);

      res.status(200).json({
        product: {
          ...productWithUrl,
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
          imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
        },
      });

      const productWithUrl = await attachSignedProductImageUrl(updated);

      res.status(200).json({
        product: {
          ...productWithUrl,
          isLowStock: updated.currentStock <= updated.minimumStockAlertQuantity,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/products/:id/image - Upload product image to S3 (Admin & Warehouse only)
productRouter.post(
  '/:id/image',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(400, 'File too large. Maximum allowed size is 5MB.'));
        }
        return next(err);
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const id = req.params.id as string;

      if (!req.file) {
        throw new AppError(400, 'No image file provided. Please attach a file in the "image" field.');
      }

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        throw new AppError(404, 'Product not found.');
      }

      // If replacing an existing S3 image, delete old file to prevent orphaned S3 objects
      if (product.imageUrl) {
        await deleteProductImage(product.imageUrl);
      }

      // Upload new image to AWS S3 (or fallback data URI)
      const objectKey = await uploadProductImage(product.id, req.file);

      // Save key in database
      const updated = await prisma.product.update({
        where: { id },
        data: { imageUrl: objectKey },
      });

      const productWithUrl = await attachSignedProductImageUrl(updated);

      res.status(200).json({
        message: 'Product image uploaded successfully.',
        product: {
          ...productWithUrl,
          isLowStock: productWithUrl.currentStock <= productWithUrl.minimumStockAlertQuantity,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/products/:id/image - Delete product image from S3 (Admin & Warehouse only)
productRouter.delete(
  '/:id/image',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;

      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        throw new AppError(404, 'Product not found.');
      }

      if (product.imageUrl) {
        await deleteProductImage(product.imageUrl);
        await prisma.product.update({
          where: { id },
          data: { imageUrl: null },
        });
      }

      res.status(200).json({
        message: 'Product image removed successfully.',
        product: {
          ...product,
          imageUrl: null,
          isLowStock: product.currentStock <= product.minimumStockAlertQuantity,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/products/:id - Delete product master record (Admin only)
productRouter.delete(
  '/:id',
  authorize(Role.ADMIN),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              challanItems: true,
              stockMovements: true,
            },
          },
        },
      });

      if (!product) {
        throw new AppError(404, 'Product not found.');
      }

      if (product._count.challanItems > 0 || product._count.stockMovements > 0) {
        throw new AppError(
          400,
          `Cannot delete product "${product.name}" (${product.sku}) because it has associated transaction history (${product._count.challanItems} challans, ${product._count.stockMovements} inventory movements).`,
        );
      }

      // Clean up orphaned image in S3
      if (product.imageUrl) {
        await deleteProductImage(product.imageUrl);
      }

      await prisma.product.delete({ where: { id } });

      res.status(200).json({
        message: `Product "${product.name}" (${product.sku}) has been deleted.`,
      });
    } catch (error) {
      next(error);
    }
  },
);
