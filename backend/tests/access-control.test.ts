import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../src/middleware/auth.js';
import { AppError } from '../src/utils/errors.js';

const { findFirst, findMany } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findFirst,
      findMany,
    },
  },
}));

import {
  assertCanReadContent,
  assertCanWriteContent,
  buildContentListFilter,
  hasPermission,
  isManagerUser,
  isSuperAdminUser,
} from '../src/services/access-control.js';

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 10,
    email: 'user@demo.local',
    firstName: 'Test',
    lastName: 'User',
    organizationId: 1,
    teamId: 1,
    managerId: null,
    roles: ['employee'],
    permissions: ['content:read', 'content:write'],
    ...overrides,
  };
}

describe('permission helpers', () => {
  it('detects permission codes', () => {
    const user = makeUser({ permissions: ['content:read'] });
    expect(hasPermission(user, 'content:read')).toBe(true);
    expect(hasPermission(user, 'user:manage')).toBe(false);
  });

  it('detects super admin and manager roles', () => {
    expect(isSuperAdminUser(makeUser({ roles: ['super_admin'] }))).toBe(true);
    expect(isManagerUser(makeUser({ roles: ['manager'] }))).toBe(true);
    expect(isManagerUser(makeUser({ roles: ['employee'] }))).toBe(false);
  });
});

describe('assertCanReadContent', () => {
  beforeEach(() => {
    findFirst.mockReset();
    findMany.mockReset();
  });

  it('allows super admin anywhere', async () => {
    await expect(
      assertCanReadContent(makeUser({ roles: ['super_admin'], permissions: ['content:read'] }), {
        userId: 99,
        organizationId: 9,
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects missing content:read', async () => {
    await expect(
      assertCanReadContent(makeUser({ permissions: [] }), { userId: 10, organizationId: 1 }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'FORBIDDEN' } satisfies Partial<AppError>);
  });

  it('rejects content outside the organization', async () => {
    await expect(
      assertCanReadContent(makeUser(), { userId: 10, organizationId: 2 }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('allows a manager to read a direct report', async () => {
    findFirst.mockResolvedValueOnce({ id: 20 });

    await expect(
      assertCanReadContent(
        makeUser({ roles: ['manager'], permissions: ['content:read'] }),
        { userId: 20, organizationId: 1 },
      ),
    ).resolves.toBeUndefined();

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 20, managerId: 10 },
    });
  });

  it('rejects an employee reading someone else', async () => {
    await expect(
      assertCanReadContent(makeUser({ roles: ['employee'] }), {
        userId: 99,
        organizationId: 1,
      }),
    ).rejects.toMatchObject({ message: 'You cannot view this content' });
  });
});

describe('assertCanWriteContent', () => {
  it('allows employees to edit their own content', async () => {
    await expect(
      assertCanWriteContent(makeUser({ roles: ['employee'] }), {
        userId: 10,
        organizationId: 1,
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects employees editing others', async () => {
    await expect(
      assertCanWriteContent(makeUser({ roles: ['employee'] }), {
        userId: 99,
        organizationId: 1,
      }),
    ).rejects.toMatchObject({ message: 'You can only modify your own content' });
  });
});

describe('buildContentListFilter', () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it('returns org-wide filter for admin roles', async () => {
    const filter = await buildContentListFilter(
      makeUser({ roles: ['admin'], permissions: ['content:read'] }),
      1,
    );
    expect(filter).toEqual({ organizationId: 1 });
  });

  it('scopes managers to self + reports', async () => {
    findMany.mockResolvedValueOnce([{ id: 21 }, { id: 22 }]);

    const filter = await buildContentListFilter(
      makeUser({ roles: ['manager'], permissions: ['content:read'] }),
      1,
    );

    expect(filter).toEqual({
      organizationId: 1,
      userId: { in: [10, 21, 22] },
    });
  });

  it('scopes employees to own content', async () => {
    const filter = await buildContentListFilter(makeUser({ roles: ['employee'] }), 1);
    expect(filter).toEqual({ organizationId: 1, userId: 10 });
  });
});
