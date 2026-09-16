import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { NamedBarChart, NamedPieChart } from '../components/dashboard/dashboard-charts';
import { DashboardPanel, StatCard } from '../components/dashboard/dashboard-ui';
import { useAppSelector, useOrgUuid, usePermissions } from '../hooks/redux';
import { fetchOrganizationStats, fetchPlatformStats } from '../lib/services';
import type { DashboardStats } from '../types/api';

function scopeLabel(scope: DashboardStats['scope']) {
  switch (scope) {
    case 'platform':
      return 'Platform-wide metrics across all tenants';
    case 'organization':
      return 'Organization-wide workforce and access metrics';
    case 'team':
      return 'Metrics for your team and direct reports';
    case 'self':
      return 'Your personal profile and team context';
  }
}

function roleHeadline(hasRole: (code: string) => boolean) {
  if (hasRole('super_admin')) return 'Platform overview';
  if (hasRole('admin')) return 'Organization health';
  if (hasRole('subscriber')) return 'Subscription & seat utilization';
  if (hasRole('manager')) return 'Team performance snapshot';
  if (hasRole('employee')) return 'My profile insights';
  if (hasRole('content_editor')) return 'Content coverage';
  if (hasRole('content_viewer')) return 'Workforce content overview';
  return 'Dashboard';
}

function utilizationTone(value: number | null | undefined) {
  if (value == null) return 'muted' as const;
  if (value >= 90) return 'warn' as const;
  if (value >= 60) return 'good' as const;
  return 'default' as const;
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return '—';
  return `${value}%`;
}

function formatDate(iso: string | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function AccessSummary({
  roles,
  permissions,
}: {
  roles: Array<{ id: number; name: string; code: string }>;
  permissions: string[];
}) {
  return (
    <DashboardPanel title="Access summary" subtitle="What this account can do in the demo">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Roles</p>
          <ul className="space-y-2">
            {roles.map((role) => (
              <li key={role.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                {role.name} <span className="text-slate-400">({role.code})</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Permissions
          </p>
          <div className="flex flex-wrap gap-2">
            {permissions.map((code) => (
              <span
                key={code}
                className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800"
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}

function PlatformDashboard({ stats }: { stats: DashboardStats }) {
  const orgChart =
    stats.organizations?.map((org) => ({
      name: org.name.replace(/\s+(Corp|Industries|Solutions)$/i, ''),
      count: org.userCount,
    })) ?? [];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Organizations"
          value={stats.summary.organizationCount ?? 0}
          hint="Active tenants on the platform"
        />
        <StatCard
          label="Users"
          value={stats.summary.userCount}
          hint={`${stats.summary.activeUserCount} active · ${stats.summary.inactiveUserCount} inactive`}
        />
        <StatCard label="Teams" value={stats.summary.teamCount} hint="Across all organizations" />
        <StatCard
          label="Seat utilization"
          value={formatPercent(stats.summary.seatsUtilization)}
          hint={
            stats.summary.seatsUsed != null && stats.summary.seats != null
              ? `${stats.summary.seatsUsed} of ${stats.summary.seats} seats used`
              : undefined
          }
          tone={utilizationTone(stats.summary.seatsUtilization)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <NamedBarChart
          title="Users per organization"
          subtitle="Headcount distribution across tenants"
          data={orgChart}
        />
        <NamedPieChart
          title="Plans"
          subtitle="Subscription mix"
          data={stats.subscriptionsByPlan ?? []}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <NamedBarChart
          title="Departments"
          subtitle="Workforce composition (all orgs)"
          data={stats.departments.slice(0, 8)}
        />
        <NamedPieChart
          title="Profile completeness"
          subtitle="How complete employee profiles are platform-wide"
          data={[
            { name: 'Complete (≥80%)', count: stats.profileCompleteness.complete },
            { name: 'Partial', count: stats.profileCompleteness.partial },
            { name: 'Empty', count: stats.profileCompleteness.empty },
          ]}
        />
      </div>

      <DashboardPanel title="Tenant comparison" subtitle="Seats, plan, and headcount by organization">
        <div className="-mx-1 overflow-x-auto overscroll-x-contain sm:mx-0">
          <table className="min-w-[36rem] w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2 font-semibold">Organization</th>
                <th className="px-2 py-2 font-semibold">Users</th>
                <th className="px-2 py-2 font-semibold">Teams</th>
                <th className="px-2 py-2 font-semibold">Plan</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Seats used</th>
              </tr>
            </thead>
            <tbody>
              {(stats.organizations ?? []).map((org) => (
                <tr key={org.id} className="border-b border-slate-100">
                  <td className="px-2 py-3 font-medium">{org.name}</td>
                  <td className="px-2 py-3 tabular-nums">{org.userCount}</td>
                  <td className="px-2 py-3 tabular-nums">{org.teamCount}</td>
                  <td className="px-2 py-3 capitalize">{org.plan ?? '—'}</td>
                  <td className="px-2 py-3 capitalize">{org.status ?? '—'}</td>
                  <td className="px-2 py-3 tabular-nums">
                    {org.seats != null
                      ? `${org.userCount}/${org.seats} (${formatPercent(org.seatsUtilization)})`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardPanel>
    </>
  );
}

function OrganizationDashboard({
  stats,
  variant,
}: {
  stats: DashboardStats;
  variant: 'admin' | 'subscriber' | 'content';
}) {
  const teamSizeData = stats.teamSizes.map((t) => ({ name: t.name, count: t.memberCount }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="People"
          value={stats.summary.userCount}
          hint={`${stats.summary.activeUserCount} active · ${stats.summary.inactiveUserCount} inactive`}
        />
        <StatCard label="Teams" value={stats.summary.teamCount} />
        <StatCard
          label="Profiles"
          value={stats.summary.contentCount}
          hint={`Avg completeness ${stats.summary.profileCompletenessAvg}%`}
        />
        {variant === 'subscriber' || stats.subscription ? (
          <StatCard
            label="Seat utilization"
            value={formatPercent(stats.summary.seatsUtilization)}
            hint={
              stats.summary.seatsUsed != null && stats.summary.seats != null
                ? `${stats.summary.seatsUsed} of ${stats.summary.seats} seats`
                : 'Subscription seats'
            }
            tone={utilizationTone(stats.summary.seatsUtilization)}
          />
        ) : (
          <StatCard
            label="Profile health"
            value={`${stats.summary.profileCompletenessAvg}%`}
            hint={`${stats.profileCompleteness.complete} profiles ≥80% complete`}
            tone={stats.summary.profileCompletenessAvg >= 70 ? 'good' : 'warn'}
          />
        )}
      </div>

      {stats.subscription && (variant === 'subscriber' || variant === 'admin') ? (
        <DashboardPanel
          title="Subscription"
          subtitle="Billing-relevant status for this organization"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Plan</p>
              <p className="mt-1 text-lg font-semibold capitalize">{stats.subscription.plan}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
              <p className="mt-1 text-lg font-semibold capitalize">{stats.subscription.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Seats</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {stats.summary.seatsUsed}/{stats.subscription.seats}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Renews</p>
              <p className="mt-1 text-lg font-semibold">{formatDate(stats.subscription.renewsAt)}</p>
            </div>
          </div>
          {variant === 'subscriber' ? (
            <p className="mt-4 text-sm text-slate-500">
              Manage plan details on the{' '}
              <Link to="/subscription" className="font-medium text-teal-700 hover:underline">
                Subscription
              </Link>{' '}
              page.
            </p>
          ) : null}
        </DashboardPanel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {variant !== 'subscriber' ? (
          <NamedBarChart
            title="Users by role"
            subtitle="Access distribution inside the organization"
            data={stats.usersByRole}
          />
        ) : (
          <NamedBarChart
            title="Team sizes"
            subtitle="Members per team (seat drivers)"
            data={teamSizeData}
          />
        )}
        <NamedPieChart
          title="Employment type"
          subtitle="Contract mix from profile content"
          data={stats.employmentTypes}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <NamedBarChart
          title="Departments"
          subtitle={variant === 'subscriber' ? 'Workforce shape affecting seats' : 'People by department'}
          data={stats.departments.slice(0, 8)}
        />
        {variant === 'admin' || variant === 'content' ? (
          <NamedBarChart title="Team sizes" subtitle="Headcount per team" data={teamSizeData} />
        ) : (
          <NamedPieChart
            title="Profile completeness"
            data={[
              { name: 'Complete (≥80%)', count: stats.profileCompleteness.complete },
              { name: 'Partial', count: stats.profileCompleteness.partial },
              { name: 'Empty', count: stats.profileCompleteness.empty },
            ]}
          />
        )}
      </div>

      {(variant === 'admin' || variant === 'content') && (
        <div className="grid gap-4 xl:grid-cols-2">
          <NamedPieChart
            title="Profile completeness"
            data={[
              { name: 'Complete (≥80%)', count: stats.profileCompleteness.complete },
              { name: 'Partial', count: stats.profileCompleteness.partial },
              { name: 'Empty', count: stats.profileCompleteness.empty },
            ]}
          />
          <NamedBarChart
            title="Tenure"
            subtitle="Based on profile start dates"
            data={stats.tenureBuckets}
          />
        </div>
      )}
    </>
  );
}

function ManagerDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Direct reports"
          value={stats.summary.reportCount ?? Math.max(stats.summary.userCount - 1, 0)}
          hint="People reporting to you"
        />
        <StatCard
          label="Visible profiles"
          value={stats.summary.contentCount}
          hint="Self + reports with content records"
        />
        <StatCard
          label="Team completeness"
          value={`${stats.summary.profileCompletenessAvg}%`}
          hint={`${stats.profileCompleteness.complete} profiles ≥80% complete`}
          tone={stats.summary.profileCompletenessAvg >= 70 ? 'good' : 'warn'}
        />
        <StatCard
          label="Your team size"
          value={stats.teamSizes[0]?.memberCount ?? stats.summary.userCount}
          hint={stats.teamSizes[0]?.name ?? 'Assigned team'}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <NamedBarChart
          title="Departments in your team"
          subtitle="Only your reports (and yourself)"
          data={stats.departments}
        />
        <NamedPieChart title="Employment types" data={stats.employmentTypes} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <NamedBarChart
          title="Job titles"
          subtitle="Roles held by your reports"
          data={stats.jobTitles}
          emptyMessage="No job titles on team profiles"
        />
        <NamedPieChart
          title="Profile completeness"
          data={[
            { name: 'Complete (≥80%)', count: stats.profileCompleteness.complete },
            { name: 'Partial', count: stats.profileCompleteness.partial },
            { name: 'Empty', count: stats.profileCompleteness.empty },
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <NamedBarChart title="Cities" data={stats.cities} emptyMessage="No city data on team profiles" />
        <NamedBarChart title="Tenure buckets" data={stats.tenureBuckets} />
      </div>
    </>
  );
}

function EmployeeDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Profile completeness"
          value={`${stats.summary.profileCompletenessAvg}%`}
          hint="Based on filled personal fields"
          tone={stats.summary.profileCompletenessAvg >= 70 ? 'good' : 'warn'}
        />
        <StatCard
          label="Content records"
          value={stats.summary.contentCount}
          hint="Your personal profile items"
        />
        <StatCard
          label="Team"
          value={stats.teamSizes[0]?.name ?? '—'}
          hint={
            stats.teamSizes[0]
              ? `${stats.teamSizes[0].memberCount} members on your team`
              : 'No team assigned'
          }
        />
        <StatCard
          label="Department signal"
          value={stats.departments[0]?.name ?? '—'}
          hint="From your profile"
        />
      </div>

      <DashboardPanel
        title="Keep your profile current"
        subtitle="Employees can edit their own content; managers can view it"
      >
        <p className="text-sm text-slate-600">
          Your dashboard focuses on personal completeness rather than org-wide charts. Update phone,
          address, job title, and avatar from{' '}
          <Link to="/content" className="font-medium text-teal-700 hover:underline">
            Content
          </Link>
          .
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase text-slate-400">Complete fields</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-teal-700">
              {stats.profileCompleteness.complete > 0 || stats.summary.profileCompletenessAvg >= 80
                ? 'On track'
                : 'Needs work'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase text-slate-400">Employment</p>
            <p className="mt-1 text-xl font-semibold capitalize">
              {stats.employmentTypes[0]?.name ?? '—'}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase text-slate-400">Location</p>
            <p className="mt-1 text-xl font-semibold">{stats.cities[0]?.name ?? '—'}</p>
          </div>
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <NamedPieChart
          title="Your completeness band"
          data={[
            { name: 'Complete (≥80%)', count: stats.profileCompleteness.complete },
            { name: 'Partial', count: stats.profileCompleteness.partial },
            { name: 'Empty', count: stats.profileCompleteness.empty },
          ]}
        />
        <NamedBarChart
          title="Tenure context"
          subtitle="Where your start date lands"
          data={stats.tenureBuckets}
          emptyMessage="Add a start date to see tenure"
        />
      </div>
    </>
  );
}

export function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const orgUuid = useOrgUuid();
  const { permissions, roles, hasRole } = usePermissions();

  const platformQuery = useQuery({
    queryKey: ['stats', 'platform'],
    queryFn: fetchPlatformStats,
    enabled: hasRole('super_admin') && !orgUuid,
  });

  const orgQuery = useQuery({
    queryKey: ['stats', 'organization', orgUuid],
    queryFn: () => fetchOrganizationStats(orgUuid!),
    enabled: Boolean(orgUuid),
  });

  const stats = orgUuid ? orgQuery.data : platformQuery.data;
  const isLoading = orgUuid ? orgQuery.isLoading : platformQuery.isLoading;
  const error = orgUuid ? orgQuery.error : platformQuery.error;

  const headline = roleHeadline(hasRole);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{headline}</h2>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Welcome back, {user?.firstName}.{' '}
          {stats ? scopeLabel(stats.scope) : 'Loading role-based metrics…'}
          {hasRole('super_admin') && !orgUuid
            ? ' Select an organization in the header for tenant-level detail.'
            : null}
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-500 sm:rounded-2xl sm:p-8">
          Loading dashboard statistics…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 sm:rounded-2xl">
          {(error as Error).message || 'Failed to load dashboard statistics'}
        </div>
      ) : null}

      {stats && hasRole('super_admin') && !orgUuid ? <PlatformDashboard stats={stats} /> : null}

      {stats && orgUuid && hasRole('super_admin') ? (
        <OrganizationDashboard stats={stats} variant="admin" />
      ) : null}

      {stats && orgUuid && hasRole('admin') && !hasRole('super_admin') ? (
        <OrganizationDashboard stats={stats} variant="admin" />
      ) : null}

      {stats && orgUuid && hasRole('subscriber') && !hasRole('admin') && !hasRole('super_admin') ? (
        <OrganizationDashboard stats={stats} variant="subscriber" />
      ) : null}

      {stats &&
      orgUuid &&
      (hasRole('content_viewer') || hasRole('content_editor')) &&
      !hasRole('admin') &&
      !hasRole('super_admin') &&
      !hasRole('subscriber') &&
      !hasRole('manager') &&
      !hasRole('employee') ? (
        <OrganizationDashboard stats={stats} variant="content" />
      ) : null}

      {stats && orgUuid && hasRole('manager') && !hasRole('admin') && !hasRole('super_admin') ? (
        <ManagerDashboard stats={stats} />
      ) : null}

      {stats &&
      orgUuid &&
      hasRole('employee') &&
      !hasRole('manager') &&
      !hasRole('admin') &&
      !hasRole('super_admin') &&
      !hasRole('subscriber') ? (
        <EmployeeDashboard stats={stats} />
      ) : null}

      {hasRole('super_admin') && !orgUuid ? null : (
        <AccessSummary roles={roles} permissions={permissions} />
      )}
    </div>
  );
}
