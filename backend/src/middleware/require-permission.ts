import type { Request, Response, NextFunction } from 'express';
import { forbidden, unauthorized } from '../utils/errors.js';

export function requirePermission(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }

    const hasAll = required.every((code) => req.user!.permissions.includes(code));
    if (!hasAll) {
      next(forbidden(`Missing required permission: ${required.join(', ')}`));
      return;
    }

    next();
  };
}

export function requireAnyPermission(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }

    const hasAny = required.some((code) => req.user!.permissions.includes(code));
    if (!hasAny) {
      next(forbidden(`Missing one of: ${required.join(', ')}`));
      return;
    }

    next();
  };
}

export function isSuperAdmin(req: Request): boolean {
  return Boolean(req.user?.roles.includes('super_admin'));
}
