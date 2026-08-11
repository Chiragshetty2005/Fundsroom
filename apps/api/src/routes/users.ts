import { Router } from 'express';
import { Role } from '@prisma/client';
import { hash } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

export const usersRouter = Router();

// Protect all user management routes with authenticate and authorize(Role.ADMIN)
usersRouter.use(authenticate, authorize(Role.ADMIN));

const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  email: z.string().trim().email('Valid email is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.nativeEnum(Role).default(Role.USER),
});

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

// GET /api/users - List all users (Admin only)
usersRouter.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdFollowUps: true,
            createdChallans: true,
            stockMovements: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ data: users });
  } catch (error) {
    next(error);
  }
});

// POST /api/users - Create a new user with specific role (Admin only)
usersRouter.post('/', async (req, res, next) => {
  try {
    const { name, email, password, role } = createUserSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError(409, 'A user with this email address already exists.');
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'User created successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/:id/role - Update user role (Admin only)
usersRouter.patch('/:id/role', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const { role } = updateRoleSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new AppError(404, 'User not found.');
    }

    // Safeguard: Prevent admin from demoting themselves if they are the only admin
    if (req.user?.userId === id && role !== Role.ADMIN) {
      const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
      if (adminCount <= 1) {
        throw new AppError(400, 'Cannot demote the only remaining administrator.');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      message: `Role for ${updatedUser.name} updated to ${role}.`,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id - Delete a user (Admin only)
usersRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id as string;

    if (req.user?.userId === id) {
      throw new AppError(400, 'You cannot delete your own admin account.');
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            createdFollowUps: true,
            createdChallans: true,
            stockMovements: true,
          },
        },
      },
    });

    if (!existingUser) {
      throw new AppError(404, 'User not found.');
    }

    // Check if user has associated relational records
    const hasActivity =
      existingUser._count.createdFollowUps > 0 ||
      existingUser._count.createdChallans > 0 ||
      existingUser._count.stockMovements > 0;

    if (hasActivity) {
      throw new AppError(
        400,
        'Cannot delete user who has recorded activity (challans, stock movements, or follow-ups). Consider changing their role instead.',
      );
    }

    await prisma.user.delete({ where: { id } });

    res.status(200).json({
      message: `User ${existingUser.name} has been removed.`,
    });
  } catch (error) {
    next(error);
  }
});
