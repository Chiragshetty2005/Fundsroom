import { Router, type CookieOptions } from 'express';
import { Role } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { authenticate, AUTH_COOKIE_NAME } from '../middleware/authenticate.js';

export const authRouter = Router();

const getAuthCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
});

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

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    res.status(201).json({
      message: 'Account created successfully.',
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

    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    res.status(200).json({
      message: 'Signed in successfully.',
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

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  res.status(200).json({
    message: 'Logged out successfully.',
  });
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

