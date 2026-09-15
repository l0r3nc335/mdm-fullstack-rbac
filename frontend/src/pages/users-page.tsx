import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser, fetchRoles, fetchTeams, fetchUsers } from '../lib/services';
import { useOrgUuid, usePermissions } from '../hooks/redux';

export function UsersPage() {
  const orgUuid = useOrgUuid();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    password: 'Password123!',
    firstName: '',
    lastName: '',
    teamId: '',
    roleId: '',
  });

  const usersQuery = useQuery({
    queryKey: ['users', orgUuid],
    queryFn: () => fetchUsers(orgUuid!),
    enabled: Boolean(orgUuid),
  });

  const teamsQuery = useQuery({
    queryKey: ['teams', orgUuid],
    queryFn: () => fetchTeams(orgUuid!),
    enabled: Boolean(orgUuid),
  });

  const rolesQuery = useQuery({
    queryKey: ['roles', orgUuid],
    queryFn: () => fetchRoles(orgUuid!),
    enabled: Boolean(orgUuid),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createUser(orgUuid!, {
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        teamId: form.teamId ? Number(form.teamId) : null,
        roleIds: [Number(form.roleId)],
      }),
    onSuccess: () => {
      setForm({
        email: '',
        password: 'Password123!',
        firstName: '',
        lastName: '',
        teamId: '',
        roleId: '',
      });
      queryClient.invalidateQueries({ queryKey: ['users', orgUuid] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(orgUuid!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', orgUuid] }),
    onError: (err: Error) => setError(err.message),
  });

  if (!orgUuid) {
    return <p className="text-slate-500">Select an organization to manage users.</p>;
  }

  if (!hasPermission('user:manage')) {
    return <p className="text-slate-500">You do not have permission to manage users.</p>;
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="text-slate-500">Create and manage organization members and role assignments.</p>
      </div>

      <form onSubmit={onCreate} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <input
          className="rounded-lg border border-slate-200 px-3 py-2"
          placeholder="First name"
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          required
        />
        <input
          className="rounded-lg border border-slate-200 px-3 py-2"
          placeholder="Last name"
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          required
        />
        <input
          className="rounded-lg border border-slate-200 px-3 py-2"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
        <input
          className="rounded-lg border border-slate-200 px-3 py-2"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
        />
        <select
          className="rounded-lg border border-slate-200 px-3 py-2"
          value={form.teamId}
          onChange={(e) => setForm((f) => ({ ...f, teamId: e.target.value }))}
        >
          <option value="">No team</option>
          {teamsQuery.data?.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2"
          value={form.roleId}
          onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value }))}
          required
        >
          <option value="">Select role</option>
          {rolesQuery.data
            ?.filter((role) => role.organizationId !== null)
            .map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
        </select>
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-white md:col-span-3">
          Create user
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.data?.map((user) => (
              <tr key={user.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.team?.name ?? '—'}</td>
                <td className="px-4 py-3">{user.roles.map((r) => r.name).join(', ')}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-red-600 hover:underline"
                    onClick={() => {
                      if (window.confirm(`Delete ${user.email}?`)) {
                        deleteMutation.mutate(user.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
