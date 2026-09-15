import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/require-permission.js';
import { resolveTenant } from '../middleware/tenant.js';
import { notFound } from '../utils/errors.js';

const teamSchema = z.object({
  name: z.string().min(2).max(120),
  managerUserId: z.number().int().positive(),
});

export const teamsRouter = Router({ mergeParams: true });

teamsRouter.use(authenticate, resolveTenant);

teamsRouter.get('/', async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      where: { organizationId: req.organization!.id },
      include: {
        manager: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: { select: { members: true } },
      },
      orderBy: { id: 'asc' },
    });
    res.json({ data: teams });
  } catch (error) {
    next(error);
  }
});

teamsRouter.post('/', requirePermission('team:manage'), async (req, res, next) => {
  try {
    const body = teamSchema.parse(req.body);

    const manager = await prisma.user.findFirst({
      where: { id: body.managerUserId, organizationId: req.organization!.id },
    });
    if (!manager) {
      throw notFound('Manager user not found in this organization');
    }

    const team = await prisma.team.create({
      data: {
        name: body.name,
        organizationId: req.organization!.id,
        managerUserId: body.managerUserId,
      },
      include: {
        manager: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: { select: { members: true } },
      },
    });

    await prisma.user.update({
      where: { id: manager.id },
      data: { teamId: team.id },
    });

    res.status(201).json({ data: team });
  } catch (error) {
    next(error);
  }
});

teamsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const team = await prisma.team.findFirst({
      where: { id, organizationId: req.organization!.id },
      include: {
        manager: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        members: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            managerId: true,
          },
        },
      },
    });
    if (!team) {
      throw notFound('Team not found');
    }
    res.json({ data: team });
  } catch (error) {
    next(error);
  }
});

teamsRouter.patch('/:id', requirePermission('team:manage'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = teamSchema.partial().parse(req.body);

    const existing = await prisma.team.findFirst({
      where: { id, organizationId: req.organization!.id },
    });
    if (!existing) {
      throw notFound('Team not found');
    }

    if (body.managerUserId) {
      const manager = await prisma.user.findFirst({
        where: { id: body.managerUserId, organizationId: req.organization!.id },
      });
      if (!manager) {
        throw notFound('Manager user not found in this organization');
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: {
        name: body.name,
        managerUserId: body.managerUserId,
      },
      include: {
        manager: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: { select: { members: true } },
      },
    });

    res.json({ data: team });
  } catch (error) {
    next(error);
  }
});

teamsRouter.delete('/:id', requirePermission('team:manage'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.team.findFirst({
      where: { id, organizationId: req.organization!.id },
    });
    if (!existing) {
      throw notFound('Team not found');
    }

    await prisma.user.updateMany({
      where: { teamId: id },
      data: { teamId: null },
    });
    await prisma.team.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
