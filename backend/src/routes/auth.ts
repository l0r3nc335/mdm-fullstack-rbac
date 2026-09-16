import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rate-limit.js';
import { verifyPassword } from '../services/password.js';
import { unauthorized } from '../utils/errors.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: {
        organization: true,
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
      throw unauthorized('Invalid email or password');
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      throw unauthorized('Invalid email or password');
    }

    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      code: ur.role.code,
      name: ur.role.name,
    }));

    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    const token = signToken(user.id, user.email);

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          organizationId: user.organizationId,
          organization: user.organization
            ? {
                id: user.organization.id,
                uuid: user.organization.uuid,
                name: user.organization.name,
              }
            : null,
          teamId: user.teamId,
          managerId: user.managerId,
          roles,
          permissions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        organization: true,
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

    if (!user) {
      throw unauthorized('User not found');
    }

    const roles = user.userRoles.map((ur) => ({
      id: ur.role.id,
      code: ur.role.code,
      name: ur.role.name,
    }));

    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    res.json({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId,
        organization: user.organization
          ? {
              id: user.organization.id,
              uuid: user.organization.uuid,
              name: user.organization.name,
            }
          : null,
        teamId: user.teamId,
        managerId: user.managerId,
        roles,
        permissions,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/demo-accounts', async (_req, res, next) => {
  try {
    const demoOrder = [
      'superadmin@demo.local',
      'admin@acmecorp.demo.local',
      'subscriber@acmecorp.demo.local',
      'manager1@acmecorp.demo.local',
      'employee1.1@acmecorp.demo.local',
      'viewer@acmecorp.demo.local',
      'editor@acmecorp.demo.local',
    ];

    const users = await prisma.user.findMany({
      where: { email: { in: demoOrder } },
      include: {
        organization: true,
        userRoles: { include: { role: true } },
      },
    });

    const labelByEmail: Record<string, string> = {
      'superadmin@demo.local': 'Super Admin',
      'admin@acmecorp.demo.local': 'Admin',
      'subscriber@acmecorp.demo.local': 'Subscriber',
      'manager1@acmecorp.demo.local': 'Manager',
      'employee1.1@acmecorp.demo.local': 'Employee',
      'viewer@acmecorp.demo.local': 'Content Viewer (read-only)',
      'editor@acmecorp.demo.local': 'Content Editor (full access)',
    };

    const byEmail = new Map(users.map((u) => [u.email, u]));

    res.json({
      data: demoOrder
        .map((email) => byEmail.get(email))
        .filter((u): u is NonNullable<typeof u> => Boolean(u))
        .map((u) => ({
          label: labelByEmail[u.email] ?? u.email,
          email: u.email,
          role: u.userRoles[0]?.role.code ?? 'unknown',
          organizationName: u.organization?.name ?? null,
        })),
    });
  } catch (error) {
    next(error);
  }
});
