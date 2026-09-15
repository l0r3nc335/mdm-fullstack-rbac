import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/require-permission.js';
import { resolveTenant } from '../middleware/tenant.js';
import { notFound } from '../utils/errors.js';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  teamId: z.number().int().positive().nullable().optional(),
  managerId: z.number().int().positive().nullable().optional(),
  roleIds: z.array(z.number().int().positive()).min(1),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  teamId: z.number().int().positive().nullable().optional(),
  managerId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.number().int().positive()).optional(),
  password: z.string().min(8).optional(),
});

function mapUser(user: {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: number | null;
  teamId: number | null;
  managerId: number | null;
  isActive: boolean;
  userRoles?: Array<{ role: { id: number; code: string; name: string } }>;
  team?: { id: number; name: string } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    organizationId: user.organizationId,
    teamId: user.teamId,
    managerId: user.managerId,
    isActive: user.isActive,
    roles: user.userRoles?.map((ur) => ur.role) ?? [],
    team: user.team ?? null,
  };
}

export const usersRouter = Router({ mergeParams: true });

usersRouter.use(authenticate, resolveTenant);

usersRouter.get('/', requirePermission('user:manage'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: req.organization!.id },
      include: {
        userRoles: { include: { role: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });
    res.json({ data: users.map(mapUser) });
  } catch (error) {
    next(error);
  }
});

usersRouter.post('/', requirePermission('user:manage'), async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);

    const roles = await prisma.role.findMany({
      where: {
        id: { in: body.roleIds },
        OR: [{ organizationId: req.organization!.id }, { organizationId: null }],
      },
    });
    if (roles.length !== body.roleIds.length) {
      throw notFound('One or more roles not found in this organization');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        firstName: body.firstName,
        lastName: body.lastName,
        organizationId: req.organization!.id,
        teamId: body.teamId ?? null,
        managerId: body.managerId ?? null,
        userRoles: {
          create: body.roleIds.map((roleId) => ({ roleId })),
        },
      },
      include: {
        userRoles: { include: { role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    await prisma.contentItem.create({
      data: {
        organizationId: req.organization!.id,
        userId: user.id,
        title: `${user.firstName} ${user.lastName} Profile`,
        jobTitle: 'New Hire',
        department: user.team?.name ?? '',
        employmentType: 'full_time',
        country: 'United States',
      },
    });

    res.status(201).json({ data: mapUser(user) });
  } catch (error) {
    next(error);
  }
});

usersRouter.get('/:id', requirePermission('user:manage'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = await prisma.user.findFirst({
      where: { id, organizationId: req.organization!.id },
      include: {
        userRoles: { include: { role: true } },
        team: { select: { id: true, name: true } },
      },
    });
    if (!user) {
      throw notFound('User not found');
    }
    res.json({ data: mapUser(user) });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch('/:id', requirePermission('user:manage'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = updateUserSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { id, organizationId: req.organization!.id },
    });
    if (!existing) {
      throw notFound('User not found');
    }

    if (body.roleIds) {
      const roles = await prisma.role.findMany({
        where: {
          id: { in: body.roleIds },
          OR: [{ organizationId: req.organization!.id }, { organizationId: null }],
        },
      });
      if (roles.length !== body.roleIds.length) {
        throw notFound('One or more roles not found');
      }

      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.userRole.createMany({
        data: body.roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }

    const passwordHash = body.password
      ? await bcrypt.hash(body.password, 10)
      : undefined;

    const user = await prisma.user.update({
      where: { id },
      data: {
        email: body.email?.toLowerCase(),
        firstName: body.firstName,
        lastName: body.lastName,
        teamId: body.teamId === undefined ? undefined : body.teamId,
        managerId: body.managerId === undefined ? undefined : body.managerId,
        isActive: body.isActive,
        passwordHash,
      },
      include: {
        userRoles: { include: { role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    res.json({ data: mapUser(user) });
  } catch (error) {
    next(error);
  }
});

usersRouter.delete('/:id', requirePermission('user:manage'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.user.findFirst({
      where: { id, organizationId: req.organization!.id },
    });
    if (!existing) {
      throw notFound('User not found');
    }

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
