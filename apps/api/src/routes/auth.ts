import { Router } from 'express';
import { Role } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { authenticate } from '../middleware/authenticate.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('Valid email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  email: z.string().trim().email('Valid email is required.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

// POST /api/auth/signup - Public registration with default USER role
authRouter.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = signupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({
        error: { message: 'An account with this email already exists.' },
      });
      return;
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.USER,
      },
    });

    const token = signToken({ userId: user.id, role: user.role });

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(401).json({
        error: { message: 'Invalid email or password.' },
      });
      return;
    }

    const passwordMatch = await compare(password, user.passwordHash);

    if (!passwordMatch) {
      res.status(401).json({
        error: { message: 'Invalid email or password.' },
      });
      return;
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      res.status(404).json({
        error: { message: 'User no longer exists.' },
      });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
});
