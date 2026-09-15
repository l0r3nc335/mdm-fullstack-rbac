import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission, requireAnyPermission } from '../middleware/require-permission.js';
import { resolveTenant } from '../middleware/tenant.js';
import {
  assertCanReadContent,
  assertCanWriteContent,
  buildContentListFilter,
} from '../services/access-control.js';
import {
  avatarAbsolutePath,
  deleteAvatarFile,
  processAndStoreAvatar,
} from '../services/avatar-service.js';
import { profileUpdateSchema, serializeContentItem } from '../services/profile-schema.js';
import { AppError, notFound } from '../utils/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400, 'AVATAR_TYPE'));
      return;
    }
    cb(null, true);
  },
});

const createContentSchema = profileUpdateSchema.extend({
  userId: z.number().int().positive(),
  title: z.string().trim().min(1).max(200),
});

const userInclude = {
  user: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const;

export const contentRouter = Router({ mergeParams: true });

contentRouter.use(authenticate, resolveTenant);

contentRouter.get('/', requireAnyPermission('content:read'), async (req, res, next) => {
  try {
    const userIdParam = req.query.userId ? Number(req.query.userId) : undefined;
    const baseFilter = await buildContentListFilter(req.user!, req.organization!.id);

    const where = {
      ...baseFilter,
      ...(userIdParam ? { userId: userIdParam } : {}),
    };

    if (userIdParam) {
      const probe = await prisma.contentItem.findFirst({
        where: { organizationId: req.organization!.id, userId: userIdParam },
      });
      if (probe) {
        await assertCanReadContent(req.user!, probe);
      } else if (userIdParam !== req.user!.id) {
        const allowed = await prisma.contentItem.findMany({ where: baseFilter });
        if (!allowed.some((c) => c.userId === userIdParam)) {
          res.json({ data: [] });
          return;
        }
      }
    }

    const items = await prisma.contentItem.findMany({
      where,
      include: userInclude,
      orderBy: { id: 'asc' },
    });

    res.json({
      data: items.map((item) => serializeContentItem(item, req.organization!.uuid)),
    });
  } catch (error) {
    next(error);
  }
});

contentRouter.get('/candidates', requirePermission('content:write'), async (req, res, next) => {
  try {
    const orgId = req.organization!.id;
    const existing = await prisma.contentItem.findMany({
      where: { organizationId: orgId },
      select: { userId: true },
    });
    const taken = new Set(existing.map((item) => item.userId));

    const users = await prisma.user.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const candidates = [];
    for (const candidate of users) {
      if (taken.has(candidate.id)) continue;
      try {
        await assertCanWriteContent(req.user!, {
          userId: candidate.id,
          organizationId: orgId,
        });
        candidates.push(candidate);
      } catch {
        // skip users the actor cannot write content for
      }
    }

    res.json({ data: candidates });
  } catch (error) {
    next(error);
  }
});

contentRouter.post('/', requirePermission('content:write'), async (req, res, next) => {
  try {
    const body = createContentSchema.parse(req.body);

    const targetUser = await prisma.user.findFirst({
      where: { id: body.userId, organizationId: req.organization!.id },
    });
    if (!targetUser) {
      throw notFound('User not found in this organization');
    }

    await assertCanWriteContent(req.user!, {
      userId: body.userId,
      organizationId: req.organization!.id,
    });

    const existing = await prisma.contentItem.findFirst({
      where: { organizationId: req.organization!.id, userId: body.userId },
    });
    if (existing) {
      throw new AppError('Content item already exists for this user', 409, 'CONTENT_EXISTS');
    }

    const item = await prisma.contentItem.create({
      data: {
        organizationId: req.organization!.id,
        userId: body.userId,
        title: body.title,
        phone: body.phone,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
        bio: body.bio,
        street: body.street,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country,
        jobTitle: body.jobTitle,
        department: body.department,
        employeeNumber: body.employeeNumber,
        employmentType: body.employmentType,
        startDate: body.startDate,
      },
      include: userInclude,
    });

    res.status(201).json({
      data: serializeContentItem(item, req.organization!.uuid),
    });
  } catch (error) {
    next(error);
  }
});

contentRouter.get('/me', requireAnyPermission('content:read'), async (req, res, next) => {
  try {
    const organizationId = req.organization!.id;
    const userId = req.user!.id;

    let item = await prisma.contentItem.findFirst({
      where: { organizationId, userId },
      include: userInclude,
    });

    if (!item) {
      const actor = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      item = await prisma.contentItem.create({
        data: {
          organizationId,
          userId,
          title: `${actor?.firstName ?? 'User'} ${actor?.lastName ?? ''} Profile`.trim(),
        },
        include: userInclude,
      });
    }

    await assertCanReadContent(req.user!, item);
    res.json({ data: serializeContentItem(item, req.organization!.uuid) });
  } catch (error) {
    next(error);
  }
});

contentRouter.get('/:id', requireAnyPermission('content:read'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.contentItem.findFirst({
      where: { id, organizationId: req.organization!.id },
      include: userInclude,
    });
    if (!item) {
      throw notFound('Content not found');
    }

    await assertCanReadContent(req.user!, item);
    res.json({ data: serializeContentItem(item, req.organization!.uuid) });
  } catch (error) {
    next(error);
  }
});

contentRouter.patch('/:id', requirePermission('content:write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const body = profileUpdateSchema.parse(req.body);

    const existing = await prisma.contentItem.findFirst({
      where: { id, organizationId: req.organization!.id },
    });
    if (!existing) {
      throw notFound('Content not found');
    }

    await assertCanWriteContent(req.user!, existing);

    const item = await prisma.contentItem.update({
      where: { id },
      data: {
        title: body.title,
        phone: body.phone,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
        bio: body.bio,
        street: body.street,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country,
        jobTitle: body.jobTitle,
        department: body.department,
        employeeNumber: body.employeeNumber,
        employmentType: body.employmentType,
        startDate: body.startDate,
      },
      include: userInclude,
    });

    res.json({ data: serializeContentItem(item, req.organization!.uuid) });
  } catch (error) {
    next(error);
  }
});

contentRouter.delete('/:id', requirePermission('content:write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.contentItem.findFirst({
      where: { id, organizationId: req.organization!.id },
    });
    if (!existing) {
      throw notFound('Content not found');
    }

    await assertCanWriteContent(req.user!, existing);
    await deleteAvatarFile(existing.avatarKey);
    await prisma.contentItem.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

contentRouter.post(
  '/:id/avatar',
  requirePermission('content:write'),
  (req, res, next) => {
    upload.single('avatar')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          next(new AppError('Avatar must be 2MB or smaller', 400, 'AVATAR_TOO_LARGE'));
          return;
        }
        next(new AppError(err.message, 400, 'AVATAR_UPLOAD'));
        return;
      }
      next(err);
    });
  },
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const existing = await prisma.contentItem.findFirst({
        where: { id, organizationId: req.organization!.id },
      });
      if (!existing) {
        throw notFound('Content not found');
      }

      await assertCanWriteContent(req.user!, existing);

      if (!req.file) {
        throw new AppError('Avatar file is required', 400, 'AVATAR_REQUIRED');
      }

      const avatarKey = await processAndStoreAvatar(req.file);
      await deleteAvatarFile(existing.avatarKey);

      const item = await prisma.contentItem.update({
        where: { id },
        data: { avatarKey },
        include: userInclude,
      });

      res.json({ data: serializeContentItem(item, req.organization!.uuid) });
    } catch (error) {
      next(error);
    }
  },
);

contentRouter.get('/:id/avatar', requireAnyPermission('content:read'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.contentItem.findFirst({
      where: { id, organizationId: req.organization!.id },
    });
    if (!item?.avatarKey) {
      throw notFound('Avatar not found');
    }

    await assertCanReadContent(req.user!, item);

    const filePath = avatarAbsolutePath(item.avatarKey);
    if (!fs.existsSync(filePath)) {
      throw notFound('Avatar file missing');
    }

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

contentRouter.delete('/:id/avatar', requirePermission('content:write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.contentItem.findFirst({
      where: { id, organizationId: req.organization!.id },
    });
    if (!existing) {
      throw notFound('Content not found');
    }

    await assertCanWriteContent(req.user!, existing);
    await deleteAvatarFile(existing.avatarKey);

    const item = await prisma.contentItem.update({
      where: { id },
      data: { avatarKey: null },
      include: userInclude,
    });

    res.json({ data: serializeContentItem(item, req.organization!.uuid) });
  } catch (error) {
    next(error);
  }
});
