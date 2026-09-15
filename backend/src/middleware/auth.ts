import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../utils/errors.js';

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: number | null;
  teamId: number | null;
  managerId: number | null;
  roles: string[];
  permissions: string[];
};

export type JwtPayload = {
  sub: number;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      organization?: {
        id: number;
        uuid: string;
        name: string;
      };
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw unauthorized('Missing or invalid authorization header');
    }

    const token = header.slice('Bearer '.length);
    const verified = jwt.verify(token, config.jwtSecret);
    if (typeof verified === 'string' || typeof verified.sub !== 'number') {
      throw unauthorized('Invalid token payload');
    }
    const payload = verified as unknown as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw unauthorized('User not found or inactive');
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      teamId: user.teamId,
      managerId: user.managerId,
      roles,
      permissions,
    };

    next();
  } catch (error) {
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      next(unauthorized('Invalid token'));
      return;
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      next(unauthorized('Token expired'));
      return;
    }
    next(error);
  }
}

export function signToken(userId: number, email: string): string {
  return jwt.sign({ sub: userId, email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}
