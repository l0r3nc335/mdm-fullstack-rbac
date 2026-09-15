import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/require-permission.js';
import { resolveTenant } from '../middleware/tenant.js';
import { forbidden, notFound } from '../utils/errors.js';

const createRoleSchema = z.object({
  code: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/),
  name: z.string().min(2).max(120),
  description: z.string().max(255).optional(),
  permissionIds: z.array(z.number().int().positive()).default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(255).nullable().optional(),
  permissionIds: z.array(z.number().int().positive()).optional(),
});

export const rolesRouter = Router({ mergeParams: true });

rolesRouter.use(authenticate, resolveTenant);

rolesRouter.get('/permissions', requirePermission('role:manage'), async (_req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: { code: 'asc' } });
    res.json({ data: permissions });
  } catch (error) {
    next(error);
  }
});

rolesRouter.get('/', requirePermission('role:manage'), async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      where: {
        OR: [{ organizationId: req.organization!.id }, { organizationId: null }],
      },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { id: 'asc' },
    });

    res.json({
      data: roles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        organizationId: role.organizationId,
        userCount: role._count.userRoles,
        permissions: role.rolePermissions.map((rp) => rp.permission),
      })),
    });
  } catch (error) {
    next(error);
  }
});

rolesRouter.post('/', requirePermission('role:manage'), async (req, res, next) => {
  try {
    const body = createRoleSchema.parse(req.body);

    const role = await prisma.role.create({
      data: {
        organizationId: req.organization!.id,
        code: body.code,
        name: body.name,
        description: body.description,
        isSystem: false,
        rolePermissions: {
          create: body.permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });

    res.status(201).json({
      data: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        organizationId: role.organizationId,
        permissions: role.rolePermissions.map((rp) => rp.permission),
      },
    });
  } catch (error) {
    next(error);
  }
});

rolesRouter.patch('/:id', requirePermission('role:manage'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = updateRoleSchema.parse(req.body);

    const existing = await prisma.role.findFirst({
      where: { id, organizationId: req.organization!.id },
    });
    if (!existing) {
      throw notFound('Role not found');
    }

    if (body.permissionIds) {
      await prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await prisma.rolePermission.createMany({
        data: body.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      });
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description === undefined ? undefined : body.description,
      },
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });

    res.json({
      data: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        organizationId: role.organizationId,
        permissions: role.rolePermissions.map((rp) => rp.permission),
      },
    });
  } catch (error) {
    next(error);
  }
});

rolesRouter.delete('/:id', requirePermission('role:manage'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.role.findFirst({
      where: { id, organizationId: req.organization!.id },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!existing) {
      throw notFound('Role not found');
    }
    if (existing.isSystem) {
      throw forbidden('System roles cannot be deleted');
    }
    if (existing._count.userRoles > 0) {
      throw forbidden('Reassign users before deleting this role');
    }

    await prisma.role.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
