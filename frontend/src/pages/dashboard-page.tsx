import { useAppSelector, usePermissions } from '../hooks/redux';

export function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { permissions, roles } = usePermissions();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-slate-500">
          Welcome back, {user?.firstName}. Your permissions are enforced by the API.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Roles</h3>
          <ul className="mt-3 space-y-2">
            {roles.map((role) => (
              <li key={role.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                {role.name} <span className="text-slate-400">({role.code})</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Permissions
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {permissions.map((code) => (
              <span
                key={code}
                className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800"
              >
                {code}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
