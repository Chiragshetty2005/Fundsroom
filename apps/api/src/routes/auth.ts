import { Router } from 'express';
import { compare } from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { authenticate } from '../middleware/authenticate.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required.'),
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
