import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmModal } from '../components/confirm-modal';
import {
  createUser,
  deleteUser,
  fetchRoles,
  fetchTeams,
  fetchUsers,
  updateUser,
} from '../lib/services';
import { useOrgUuid, usePermissions } from '../hooks/redux';
import type { AppUser } from '../types/api';

const emptyForm = {
  email: '',
  password: 'Password123!',
  firstName: '',
  lastName: '',
  teamId: '',
  roleId: '',
};

export function UsersPage() {
  const orgUuid = useOrgUuid();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    teamId: '',
    roleId: '',
    password: '',
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
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['users', orgUuid] });
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateUser(orgUuid!, editing!.id, {
        email: editForm.email,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        teamId: editForm.teamId ? Number(editForm.teamId) : null,
        roleIds: [Number(editForm.roleId)],
        ...(editForm.password ? { password: editForm.password } : {}),
      }),
    onSuccess: () => {
      setEditing(null);
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

  const orgRoles = rolesQuery.data?.filter((role) => role.organizationId !== null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="text-slate-500">Create, update, and delete organization members and roles.</p>
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
          {orgRoles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-white md:col-span-3">
          Create user
        </button>
      </form>

      {editing && (
        <form
          className="grid gap-3 rounded-2xl border border-teal-200 bg-teal-50/40 p-4 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            updateMutation.mutate();
          }}
        >
          <p className="md:col-span-3 text-sm font-medium text-teal-900">
            Editing {editing.email}
          </p>
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={editForm.firstName}
            onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={editForm.lastName}
            onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            type="password"
            placeholder="New password (optional)"
            value={editForm.password}
            onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={editForm.teamId}
            onChange={(e) => setEditForm((f) => ({ ...f, teamId: e.target.value }))}
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
            value={editForm.roleId}
            onChange={(e) => setEditForm((f) => ({ ...f, roleId: e.target.value }))}
            required
          >
            {orgRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2 md:col-span-3">
            <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-white">
              Save changes
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

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
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="text-teal-700 hover:underline"
                      onClick={() => {
                        setEditing(user);
                        setEditForm({
                          email: user.email,
                          firstName: user.firstName,
                          lastName: user.lastName,
                          teamId: user.teamId ? String(user.teamId) : '',
                          roleId: user.roles[0] ? String(user.roles[0].id) : '',
                          password: '',
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => setDeleteTarget(user)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete user"
        message={`Delete ${deleteTarget?.email ?? 'this user'}? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
