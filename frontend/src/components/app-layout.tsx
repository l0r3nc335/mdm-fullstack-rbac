import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { logout, setActiveOrganization } from '../store/auth-slice';
import { useAppDispatch, useAppSelector, usePermissions } from '../hooks/redux';
import { fetchOrganizations } from '../lib/services';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm transition ${
    isActive ? 'bg-teal-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`;

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { hasPermission, hasRole } = usePermissions();

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
    enabled: Boolean(user),
  });

  const navItems = [
    { to: '/', label: 'Dashboard', show: true },
    {
      to: '/organizations',
      label: 'Organizations',
      show: hasRole('super_admin') || hasPermission('org:manage') || hasRole('admin'),
    },
    { to: '/teams', label: 'Teams', show: hasPermission('team:manage') || Boolean(user?.organization) },
    { to: '/users', label: 'Users', show: hasPermission('user:manage') },
    { to: '/roles', label: 'Roles', show: hasPermission('role:manage') },
    { to: '/content', label: 'Content', show: hasPermission('content:read') },
    { to: '/profile', label: 'Profile', show: hasPermission('content:read') },
    { to: '/subscription', label: 'Subscription', show: hasPermission('subscription:manage') },
  ].filter((item) => item.show);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-800 bg-slate-950 text-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="px-5 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-teal-300">RBAC Demo</p>
          <h1 className="mt-2 text-xl font-semibold">Access Console</h1>
        </div>
        <nav className="space-y-1 px-3 pb-6">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-sm text-slate-500">Signed in as</p>
            <p className="font-medium">
              {user?.firstName} {user?.lastName}{' '}
              <span className="text-sm font-normal text-slate-500">
                ({user?.roles.map((r) => r.name).join(', ')})
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasRole('super_admin') && (
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={user?.organization?.uuid ?? ''}
                onChange={(e) => {
                  const org = orgsQuery.data?.find((o) => o.uuid === e.target.value);
                  if (org) {
                    dispatch(
                      setActiveOrganization({
                        id: org.id,
                        uuid: org.uuid,
                        name: org.name,
                      }),
                    );
                  }
                }}
              >
                <option value="" disabled>
                  Select organization
                </option>
                {orgsQuery.data?.map((org) => (
                  <option key={org.uuid} value={org.uuid}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}

            {!hasRole('super_admin') && user?.organization && (
              <span className="rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800">
                {user.organization.name}
              </span>
            )}

            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
              onClick={() => {
                dispatch(logout());
                navigate('/login');
              }}
            >
              Log out
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
