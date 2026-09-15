import type { AuthUser } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  buildContentListFilter,
  hasPermission,
  isManagerUser,
  isSuperAdminUser,
} from './access-control.js';

type NamedCount = { name: string; count: number };

export type DashboardStats = {
  scope: 'platform' | 'organization' | 'team' | 'self';
  organization: { id: number; uuid: string; name: string } | null;
  summary: {
    organizationCount?: number;
    userCount: number;
    activeUserCount: number;
    inactiveUserCount: number;
    teamCount: number;
    contentCount: number;
    reportCount?: number;
    seats: number | null;
    seatsUsed: number | null;
    seatsUtilization: number | null;
    profileCompletenessAvg: number;
  };
  subscription: {
    plan: string;
    status: string;
    seats: number;
    renewsAt: string;
  } | null;
  usersByRole: NamedCount[];
  teamSizes: Array<{ id: number; name: string; memberCount: number }>;
  departments: NamedCount[];
  employmentTypes: NamedCount[];
  genders: NamedCount[];
  cities: NamedCount[];
  jobTitles: NamedCount[];
  tenureBuckets: NamedCount[];
  profileCompleteness: {
    complete: number;
    partial: number;
    empty: number;
    averageScore: number;
  };
  organizations?: Array<{
    id: number;
    uuid: string;
    name: string;
    userCount: number;
    teamCount: number;
    plan: string | null;
    status: string | null;
    seats: number | null;
    seatsUtilization: number | null;
  }>;
  subscriptionsByPlan?: NamedCount[];
  subscriptionsByStatus?: NamedCount[];
};

const PROFILE_FIELDS = [
  'phone',
  'dateOfBirth',
  'gender',
  'bio',
  'street',
  'city',
  'state',
  'postalCode',
  'country',
  'jobTitle',
  'department',
  'employeeNumber',
  'employmentType',
  'startDate',
  'avatarKey',
] as const;

function countBy(values: Array<string | null | undefined>): NamedCount[] {
  const map = new Map<string, number>();
  for (const value of values) {
    const key = value?.trim() ? value.trim() : 'Unknown';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function profileScore(item: Record<string, unknown>): number {
  let filled = 0;
  for (const field of PROFILE_FIELDS) {
    const value = item[field];
    if (value !== null && value !== undefined && value !== '') {
      filled += 1;
    }
  }
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

function tenureBucket(startDate: Date | null): string {
  if (!startDate) {
    return 'Unknown';
  }
  const years = (Date.now() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 1) return '< 1 year';
  if (years < 3) return '1–3 years';
  if (years < 5) return '3–5 years';
  return '5+ years';
}

function canSeeSubscription(user: AuthUser): boolean {
  return isSuperAdminUser(user) || hasPermission(user, 'subscription:manage');
}

function resolveScope(user: AuthUser): DashboardStats['scope'] {
  if (
    isSuperAdminUser(user) ||
    user.roles.includes('admin') ||
    user.roles.includes('subscriber') ||
    user.roles.includes('content_viewer') ||
    user.roles.includes('content_editor')
  ) {
    return 'organization';
  }
  if (isManagerUser(user)) {
    return 'team';
  }
  return 'self';
}

function completenessBreakdown(scores: number[]) {
  const averageScore =
    scores.length === 0 ? 0 : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return {
    complete: scores.filter((s) => s >= 80).length,
    partial: scores.filter((s) => s > 0 && s < 80).length,
    empty: scores.filter((s) => s === 0).length,
    averageScore,
  };
}

export async function getPlatformStats(): Promise<DashboardStats> {
  const organizations = await prisma.organization.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: { select: { users: true, teams: true } },
      subscription: true,
    },
  });

  const [userCount, activeUserCount, teamCount, contentCount, contentItems] = await Promise.all([
    prisma.user.count({ where: { organizationId: { not: null } } }),
    prisma.user.count({ where: { organizationId: { not: null }, isActive: true } }),
    prisma.team.count(),
    prisma.contentItem.count(),
    prisma.contentItem.findMany({
      select: {
        phone: true,
        dateOfBirth: true,
        gender: true,
        bio: true,
        street: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        jobTitle: true,
        department: true,
        employeeNumber: true,
        employmentType: true,
        startDate: true,
        avatarKey: true,
      },
    }),
  ]);

  const inactiveUserCount = userCount - activeUserCount;
  const totalSeats = organizations.reduce((sum, org) => sum + (org.subscription?.seats ?? 0), 0);
  const seatsUsed = organizations.reduce((sum, org) => sum + org._count.users, 0);
  const scores = contentItems.map((item) => profileScore(item));
  const profileCompleteness = completenessBreakdown(scores);

  return {
    scope: 'platform',
    organization: null,
    summary: {
      organizationCount: organizations.length,
      userCount,
      activeUserCount,
      inactiveUserCount,
      teamCount,
      contentCount,
      seats: totalSeats || null,
      seatsUsed,
      seatsUtilization: totalSeats > 0 ? Math.round((seatsUsed / totalSeats) * 1000) / 10 : null,
      profileCompletenessAvg: profileCompleteness.averageScore,
    },
    subscription: null,
    usersByRole: [],
    teamSizes: [],
    departments: countBy(contentItems.map((c) => c.department)),
    employmentTypes: countBy(contentItems.map((c) => c.employmentType)),
    genders: countBy(contentItems.map((c) => c.gender)),
    cities: countBy(contentItems.map((c) => c.city)).slice(0, 8),
    jobTitles: countBy(contentItems.map((c) => c.jobTitle)).slice(0, 8),
    tenureBuckets: countBy(contentItems.map((c) => tenureBucket(c.startDate))),
    profileCompleteness,
    organizations: organizations.map((org) => {
      const seats = org.subscription?.seats ?? null;
      return {
        id: org.id,
        uuid: org.uuid,
        name: org.name,
        userCount: org._count.users,
        teamCount: org._count.teams,
        plan: org.subscription?.plan ?? null,
        status: org.subscription?.status ?? null,
        seats,
        seatsUtilization:
          seats && seats > 0 ? Math.round((org._count.users / seats) * 1000) / 10 : null,
      };
    }),
    subscriptionsByPlan: countBy(organizations.map((o) => o.subscription?.plan ?? null)),
    subscriptionsByStatus: countBy(organizations.map((o) => o.subscription?.status ?? null)),
  };
}

export async function getOrganizationStats(
  user: AuthUser,
  organization: { id: number; uuid: string; name: string },
): Promise<DashboardStats> {
  const scope = resolveScope(user);
  const contentFilter = await buildContentListFilter(user, organization.id);
  const showSubscription = canSeeSubscription(user);
  const isOrgWide = scope === 'organization';

  let scopedUserIds: number[] | null = null;
  let reportCount: number | undefined;

  if (scope === 'team' && isManagerUser(user)) {
    const reports = await prisma.user.findMany({
      where: { managerId: user.id, organizationId: organization.id },
      select: { id: true },
    });
    reportCount = reports.length;
    scopedUserIds = [user.id, ...reports.map((r) => r.id)];
  } else if (scope === 'self') {
    scopedUserIds = [user.id];
  }

  const userWhere =
    scopedUserIds === null
      ? { organizationId: organization.id }
      : { organizationId: organization.id, id: { in: scopedUserIds } };

  const teamWhere = {
    organizationId: organization.id,
    ...(scope !== 'organization' && user.teamId ? { id: user.teamId } : {}),
  };

  const [users, teams, contentItems, subscription, roleRows, orgUserCount, orgActiveCount, orgTeamCount] =
    await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          isActive: true,
          userRoles: { include: { role: { select: { code: true, name: true } } } },
        },
      }),
      prisma.team.findMany({
        where: teamWhere,
        include: { _count: { select: { members: true } } },
        orderBy: { id: 'asc' },
      }),
      prisma.contentItem.findMany({
        where: contentFilter,
        select: {
          phone: true,
          dateOfBirth: true,
          gender: true,
          bio: true,
          street: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          jobTitle: true,
          department: true,
          employeeNumber: true,
          employmentType: true,
          startDate: true,
          avatarKey: true,
        },
      }),
      showSubscription
        ? prisma.subscription.findUnique({ where: { organizationId: organization.id } })
        : Promise.resolve(null),
      isOrgWide
        ? prisma.role.findMany({
            where: { organizationId: organization.id },
            select: {
              code: true,
              name: true,
              userRoles: {
                where: { user: { organizationId: organization.id } },
                select: { userId: true },
              },
            },
          })
        : Promise.resolve([]),
      isOrgWide
        ? prisma.user.count({ where: { organizationId: organization.id } })
        : Promise.resolve(0),
      isOrgWide
        ? prisma.user.count({ where: { organizationId: organization.id, isActive: true } })
        : Promise.resolve(0),
      isOrgWide
        ? prisma.team.count({ where: { organizationId: organization.id } })
        : Promise.resolve(0),
    ]);

  const activeUserCount = isOrgWide
    ? orgActiveCount
    : users.filter((u) => u.isActive).length;
  const userCount = isOrgWide ? orgUserCount : users.length;
  const inactiveUserCount = userCount - activeUserCount;
  const teamCount = isOrgWide ? orgTeamCount : teams.length;
  const scores = contentItems.map((item) => profileScore(item));
  const profileCompleteness = completenessBreakdown(scores);

  const usersByRole: NamedCount[] = isOrgWide
    ? roleRows
        .map((role) => ({
          name: role.name,
          count: new Set(role.userRoles.map((ur) => ur.userId)).size,
        }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count)
    : countBy(users.flatMap((u) => u.userRoles.map((ur) => ur.role.name)));

  const seats = showSubscription ? (subscription?.seats ?? null) : null;
  const seatsUsed = showSubscription ? (isOrgWide ? orgUserCount : userCount) : null;

  return {
    scope,
    organization,
    summary: {
      userCount,
      activeUserCount,
      inactiveUserCount,
      teamCount,
      contentCount: contentItems.length,
      reportCount,
      seats,
      seatsUsed,
      seatsUtilization:
        seats && seats > 0 && seatsUsed !== null
          ? Math.round((seatsUsed / seats) * 1000) / 10
          : null,
      profileCompletenessAvg: profileCompleteness.averageScore,
    },
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          seats: subscription.seats,
          renewsAt: subscription.renewsAt.toISOString(),
        }
      : null,
    usersByRole,
    teamSizes: teams.map((t) => ({
      id: t.id,
      name: t.name,
      memberCount: t._count.members,
    })),
    departments: countBy(contentItems.map((c) => c.department)),
    employmentTypes: countBy(contentItems.map((c) => c.employmentType)),
    genders: countBy(contentItems.map((c) => c.gender)),
    cities: countBy(contentItems.map((c) => c.city)).slice(0, 8),
    jobTitles: countBy(contentItems.map((c) => c.jobTitle)).slice(0, 8),
    tenureBuckets: countBy(contentItems.map((c) => tenureBucket(c.startDate))),
    profileCompleteness,
  };
}
