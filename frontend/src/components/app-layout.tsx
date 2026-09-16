import { useEffect, useId, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { logout, setActiveOrganization } from '../store/auth-slice';
import { useAppDispatch, useAppSelector, usePermissions } from '../hooks/redux';
import { fetchOrganizations } from '../lib/services';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2.5 text-sm transition ${
    isActive ? 'bg-teal-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`;

export function AppLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const { hasPermission, hasRole } = usePermissions();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navTitleId = useId();

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

  // Close drawer on route change (mobile)
  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!isNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isNavOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isNavOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsNavOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isNavOpen]);

  const brand = (
    <div className="px-5 py-5">
      <p className="text-xs uppercase tracking-[0.2em] text-teal-300">RBAC Demo</p>
      <h1 id={navTitleId} className="mt-1 text-lg font-semibold sm:text-xl">
        Access Console
      </h1>
    </div>
  );

  const navLinks = (
    <nav className="space-y-1 px-3 pb-6" aria-label="Primary">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClass}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-slate-800 bg-slate-950 text-white lg:block lg:min-h-screen">
        {brand}
        {navLinks}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${isNavOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!isNavOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-slate-950/50 transition-opacity ${
            isNavOpen ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Close navigation"
          onClick={() => setIsNavOpen(false)}
        />
        <aside
          id="mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-labelledby={navTitleId}
          className={`absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col bg-slate-950 text-white shadow-xl transition-transform duration-200 ease-out ${
            isNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-800">
            {brand}
            <button
              type="button"
              className="m-3 rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
              aria-label="Close menu"
              onClick={() => setIsNavOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pt-2">{navLinks}</div>
        </aside>
      </div>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-3 py-3 sm:px-4 sm:py-3.5 lg:px-6">
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-expanded={isNavOpen}
              aria-controls="mobile-nav"
              aria-label="Open navigation menu"
              onClick={() => setIsNavOpen(true)}
            >
              <MenuIcon />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-500 sm:text-sm">Signed in as</p>
              <p className="truncate font-medium text-sm sm:text-base">
                {user?.firstName} {user?.lastName}
                <span className="hidden font-normal text-slate-500 sm:inline">
                  {' '}
                  ({user?.roles.map((r) => r.name).join(', ')})
                </span>
              </p>
              <p className="truncate text-xs text-slate-500 sm:hidden">
                {user?.roles.map((r) => r.name).join(', ')}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {hasRole('super_admin') && (
                <select
                  className="max-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs sm:max-w-[14rem] sm:px-3 sm:text-sm"
                  value={user?.organization?.uuid ?? ''}
                  aria-label="Active organization"
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
                    Organization
                  </option>
                  {orgsQuery.data?.map((org) => (
                    <option key={org.uuid} value={org.uuid}>
                      {org.name}
                    </option>
                  ))}
                </select>
              )}

              {!hasRole('super_admin') && user?.organization && (
                <span className="hidden max-w-[10rem] truncate rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-800 sm:inline-block sm:max-w-none sm:px-3 sm:text-sm">
                  {user.organization.name}
                </span>
              )}

              <button
                type="button"
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-700 sm:px-4 sm:text-sm"
                onClick={() => {
                  dispatch(logout());
                  navigate('/login');
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
