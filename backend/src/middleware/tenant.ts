import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { forbidden, notFound, unauthorized } from '../utils/errors.js';
import { isSuperAdmin } from './require-permission.js';

export async function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw unauthorized();
    }

    const orgUuid = req.params.orgUuid;
    if (!orgUuid) {
      throw notFound('Organization UUID required');
    }

    const organization = await prisma.organization.findUnique({
      where: { uuid: orgUuid },
    });

    if (!organization) {
      throw notFound('Organization not found');
    }

    if (!isSuperAdmin(req) && req.user.organizationId !== organization.id) {
      throw forbidden('You do not have access to this organization');
    }

    req.organization = {
      id: organization.id,
      uuid: organization.uuid,
      name: organization.name,
    };

    next();
  } catch (error) {
    next(error);
  }
}
