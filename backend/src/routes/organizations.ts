import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, isSuperAdmin } from '../middleware/require-permission.js';
import { forbidden, notFound } from '../utils/errors.js';

const createOrgSchema = z.object({
  name: z.string().min(2).max(120),
});

const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
});

export const organizationsRouter = Router();

organizationsRouter.use(authenticate);

organizationsRouter.get('/', async (req, res, next) => {
  try {
    if (isSuperAdmin(req)) {
      const organizations = await prisma.organization.findMany({
        orderBy: { id: 'asc' },
        include: {
          _count: { select: { users: true, teams: true } },
          subscription: true,
        },
      });
      res.json({ data: organizations });
      return;
    }

    if (!req.user!.organizationId) {
      res.json({ data: [] });
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.user!.organizationId },
      include: {
        _count: { select: { users: true, teams: true } },
        subscription: true,
      },
    });

    res.json({ data: organization ? [organization] : [] });
  } catch (error) {
    next(error);
  }
});

organizationsRouter.post('/', requirePermission('org:manage'), async (req, res, next) => {
  try {
    if (!isSuperAdmin(req)) {
      throw forbidden('Only super admin can create organizations');
    }

    const body = createOrgSchema.parse(req.body);
    const organization = await prisma.organization.create({
      data: {
        name: body.name,
        subscription: {
          create: {
            plan: 'starter',
            status: 'active',
            seats: 50,
            renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: { subscription: true },
    });

    const permissions = await prisma.permission.findMany();
    const roleDefs = [
      {
        code: 'admin',
        name: 'Admin',
        permissionCodes: [
          'team:manage',
          'user:manage',
          'role:manage',
          'content:read',
          'content:write',
          'subscription:manage',
        ],
      },
      {
        code: 'subscriber',
        name: 'Subscriber',
        permissionCodes: ['subscription:manage', 'content:read'],
      },
      {
        code: 'manager',
        name: 'Manager',
        permissionCodes: ['content:read'],
      },
      {
        code: 'employee',
        name: 'Employee',
        permissionCodes: ['content:read', 'content:write'],
      },
      {
        code: 'content_viewer',
        name: 'Content Viewer',
        permissionCodes: ['content:read'],
      },
      {
        code: 'content_editor',
        name: 'Content Editor',
        permissionCodes: ['content:read', 'content:write'],
      },
    ];

    for (const def of roleDefs) {
      const role = await prisma.role.create({
        data: {
          organizationId: organization.id,
          code: def.code,
          name: def.name,
          isSystem: true,
        },
      });
      const matched = permissions.filter((p) => def.permissionCodes.includes(p.code));
      await prisma.rolePermission.createMany({
        data: matched.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }

    res.status(201).json({ data: organization });
  } catch (error) {
    next(error);
  }
});

organizationsRouter.get('/:orgUuid', async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { uuid: req.params.orgUuid },
      include: {
        _count: { select: { users: true, teams: true } },
        subscription: true,
      },
    });

    if (!organization) {
      throw notFound('Organization not found');
    }

    if (!isSuperAdmin(req) && req.user!.organizationId !== organization.id) {
      throw forbidden('You do not have access to this organization');
    }

    res.json({ data: organization });
  } catch (error) {
    next(error);
  }
});

organizationsRouter.patch('/:orgUuid', requirePermission('org:manage'), async (req, res, next) => {
  try {
    if (!isSuperAdmin(req)) {
      throw forbidden('Only super admin can update organizations');
    }

    const body = updateOrgSchema.parse(req.body);
    const existing = await prisma.organization.findUnique({
      where: { uuid: req.params.orgUuid },
    });
    if (!existing) {
      throw notFound('Organization not found');
    }

    const organization = await prisma.organization.update({
      where: { id: existing.id },
      data: { name: body.name },
      include: { subscription: true },
    });

    res.json({ data: organization });
  } catch (error) {
    next(error);
  }
});
