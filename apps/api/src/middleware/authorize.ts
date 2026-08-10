import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';

export function authorize(...allowedRoles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        error: { message: 'Authentication required.' },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: { message: 'Insufficient permissions.' },
      });
      return;
    }

    next();
  };
}
