import type { AuthUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { forbidden } from '../utils/errors.js';

export function hasPermission(user: AuthUser, code: string): boolean {
  return user.permissions.includes(code);
}

export function isSuperAdminUser(user: AuthUser): boolean {
  return user.roles.includes('super_admin');
}

export function isManagerUser(user: AuthUser): boolean {
  return user.roles.includes('manager');
}

/** Content visibility: super/admin with write/read org-wide; manager team; employee own */
export async function assertCanReadContent(
  user: AuthUser,
  content: { userId: number; organizationId: number },
) {
  if (!hasPermission(user, 'content:read')) {
    throw forbidden('Missing content:read permission');
  }

  if (isSuperAdminUser(user)) {
    return;
  }

  if (user.organizationId !== content.organizationId) {
    throw forbidden('Content outside your organization');
  }

  if (hasPermission(user, 'content:write') && user.roles.includes('admin')) {
    return;
  }

  if (user.roles.includes('admin') || user.roles.includes('content_editor')) {
    return;
  }

  if (content.userId === user.id) {
    return;
  }

  if (isManagerUser(user)) {
    const report = await prisma.user.findFirst({
      where: { id: content.userId, managerId: user.id },
    });
    if (report) {
      return;
    }
  }

  if (user.roles.includes('content_viewer') || user.roles.includes('subscriber')) {
    // org-scoped view-only roles can read all org content
    return;
  }

  throw forbidden('You cannot view this content');
}

export async function assertCanWriteContent(
  user: AuthUser,
  content: { userId: number; organizationId: number },
) {
  if (!hasPermission(user, 'content:write')) {
    throw forbidden('Missing content:write permission');
  }

  if (isSuperAdminUser(user)) {
    return;
  }

  if (user.organizationId !== content.organizationId) {
    throw forbidden('Content outside your organization');
  }

  if (user.roles.includes('admin') || user.roles.includes('content_editor')) {
    return;
  }

  if (content.userId === user.id) {
    return;
  }

  throw forbidden('You can only modify your own content');
}

export async function buildContentListFilter(user: AuthUser, organizationId: number) {
  if (isSuperAdminUser(user) || user.roles.includes('admin') || user.roles.includes('content_editor') || user.roles.includes('content_viewer') || user.roles.includes('subscriber')) {
    return { organizationId };
  }

  if (isManagerUser(user)) {
    const reportIds = await prisma.user.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });
    return {
      organizationId,
      userId: { in: [user.id, ...reportIds.map((r) => r.id)] },
    };
  }

  // employee / default: own only
  return { organizationId, userId: user.id };
}
