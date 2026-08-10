import { Router } from 'express';
import { CustomerStatus, CustomerType, Role } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const customerRouter = Router();

// Protect all customer routes with authentication
customerRouter.use(authenticate);

const querySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  type: z.nativeEnum(CustomerType).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const optionalDateSchema = z
  .union([z.string().trim(), z.date()])
  .optional()
  .nullable()
  .transform((val) => {
    if (!val || val === '') return null;
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format.');
    }
    return date;
  });

const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required.'),
  mobile: z.string().trim().min(7, 'Valid mobile number is required.'),
  email: z.string().trim().email('Valid email is required.'),
  businessName: z.string().trim().min(1, 'Business name is required.'),
  gstNumber: z.string().trim().optional().nullable(),
  type: z.nativeEnum(CustomerType),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  address: z.string().trim().min(1, 'Address is required.'),
  followUpDate: optionalDateSchema,
  notes: z.string().trim().optional().nullable(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const followUpSchema = z.object({
  note: z.string().trim().min(1, 'Follow-up note cannot be empty.'),
  nextFollowUpDate: optionalDateSchema,
});

// GET /api/customers - List customers with search, filtering, and pagination
customerRouter.get(
  '/',
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  async (req, res, next) => {
    try {
      const { search, status, type, page, limit } = querySchema.parse(req.query);
      const skip = (page - 1) * limit;

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (type) {
        where.type = type;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { businessName: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, customers] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { followUps: true, challans: true },
            },
          },
        }),
      ]);

      res.status(200).json({
        data: customers,
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

// POST /api/customers - Create a new customer
customerRouter.post(
  '/',
  authorize(Role.ADMIN, Role.SALES),
  async (req, res, next) => {
    try {
      const data = createCustomerSchema.parse(req.body);

      const customer = await prisma.customer.create({
        data,
      });

      res.status(201).json({ customer });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/customers/:id - View customer details with follow-up timeline
customerRouter.get(
  '/:id',
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          followUps: {
            orderBy: { createdAt: 'desc' },
            include: {
              createdBy: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
          challans: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              challanNumber: true,
              status: true,
              totalQuantity: true,
              createdAt: true,
              confirmedAt: true,
            },
          },
        },
      });

      if (!customer) {
        throw new AppError(404, 'Customer not found.');
      }

      res.status(200).json({ customer });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/customers/:id - Update customer details
customerRouter.put(
  '/:id',
  authorize(Role.ADMIN, Role.SALES),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const data = updateCustomerSchema.parse(req.body);

      const existing = await prisma.customer.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, 'Customer not found.');
      }

      const updated = await prisma.customer.update({
        where: { id },
        data,
      });

      res.status(200).json({ customer: updated });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/customers/:id/follow-ups - Add a follow-up note to customer
customerRouter.post(
  '/:id/follow-ups',
  authorize(Role.ADMIN, Role.SALES),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const { note, nextFollowUpDate } = followUpSchema.parse(req.body);

      const existing = await prisma.customer.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, 'Customer not found.');
      }

      const followUp = await prisma.$transaction(async (tx) => {
        const created = await tx.customerFollowUp.create({
          data: {
            customerId: id,
            createdById: req.user!.userId,
            note,
            nextFollowUpDate: nextFollowUpDate ?? null,
          },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });

        if (nextFollowUpDate) {
          await tx.customer.update({
            where: { id },
            data: { followUpDate: nextFollowUpDate },
          });
        }

        return created;
      });

      res.status(201).json({ followUp });
    } catch (error) {
      next(error);
    }
  },
);

