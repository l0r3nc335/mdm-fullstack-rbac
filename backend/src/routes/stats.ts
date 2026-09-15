import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { isSuperAdmin } from '../middleware/require-permission.js';
import { resolveTenant } from '../middleware/tenant.js';
import { forbidden } from '../utils/errors.js';
import { getOrganizationStats, getPlatformStats } from '../services/dashboard-stats.js';

export const platformStatsRouter = Router();
export const orgStatsRouter = Router({ mergeParams: true });

platformStatsRouter.use(authenticate);

platformStatsRouter.get('/', async (req, res, next) => {
  try {
    if (!isSuperAdmin(req)) {
      throw forbidden('Only super admin can view platform stats');
    }
    const stats = await getPlatformStats();
    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
});

orgStatsRouter.use(authenticate, resolveTenant);

orgStatsRouter.get('/', async (req, res, next) => {
  try {
    const stats = await getOrganizationStats(req.user!, {
      id: req.organization!.id,
      uuid: req.organization!.uuid,
      name: req.organization!.name,
    });
    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
});
