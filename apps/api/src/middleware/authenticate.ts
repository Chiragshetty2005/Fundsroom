import type { RequestHandler } from 'express';

import { verifyToken } from '../lib/jwt.js';

export const authenticate: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({
      error: { message: 'Authentication required. Provide a Bearer token.' },
    });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res.status(401).json({
      error: { message: 'Invalid or expired token.' },
    });
  }
};
