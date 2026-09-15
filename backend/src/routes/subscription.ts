import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/require-permission.js';
import { resolveTenant } from '../middleware/tenant.js';
import { notFound } from '../utils/errors.js';

const updateSubscriptionSchema = z.object({
  plan: z.enum(['starter', 'business', 'enterprise']).optional(),
  status: z.enum(['active', 'past_due', 'canceled']).optional(),
  seats: z.number().int().positive().max(10000).optional(),
});

export const subscriptionRouter = Router({ mergeParams: true });

subscriptionRouter.use(authenticate, resolveTenant);

subscriptionRouter.get('/', requirePermission('subscription:manage'), async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: req.organization!.id },
    });
    if (!subscription) {
      throw notFound('Subscription not found');
    }
    res.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionRouter.patch('/', requirePermission('subscription:manage'), async (req, res, next) => {
  try {
    const body = updateSubscriptionSchema.parse(req.body);
    const existing = await prisma.subscription.findUnique({
      where: { organizationId: req.organization!.id },
    });
    if (!existing) {
      throw notFound('Subscription not found');
    }

    const subscription = await prisma.subscription.update({
      where: { organizationId: req.organization!.id },
      data: {
        plan: body.plan,
        status: body.status,
        seats: body.seats,
      },
    });

    res.json({ data: subscription });
  } catch (error) {
    next(error);
  }
});
