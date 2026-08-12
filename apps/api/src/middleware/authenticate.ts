import type { RequestHandler } from 'express';

import { verifyToken } from '../lib/jwt.js';

export const AUTH_COOKIE_NAME = 'auth_token';

export const authenticate: RequestHandler = (req, res, next) => {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] || req.cookies?.token;
  const authHeader = req.headers.authorization;
  const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = cookieToken || headerToken;

  if (!token) {
    res.status(401).json({
      error: { message: 'Authentication required. Please sign in.' },
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({
      error: { message: 'Invalid or expired session. Please sign in again.' },
    });
  }
};

