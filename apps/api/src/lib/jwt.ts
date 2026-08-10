import jwt from 'jsonwebtoken';

import type { Role } from '@prisma/client';

import { env } from '../config/env.js';

export interface JwtPayload {
  userId: string;
  role: Role;
  iat: number;
  exp: number;
}

const JWT_EXPIRES_IN = '8h';

export function signToken(payload: { userId: string; role: Role }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
