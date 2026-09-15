import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import {
  createRole,
  deleteRole,
  fetchPermissions,
  fetchRoles,
  updateRolePermissions,
} from '../lib/services';
import { useOrgUuid, usePermissions } from '../hooks/redux';

export function RolesPage() {
  const orgUuid = useOrgUuid();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [createForm, setCreateForm] = useState({
    code: '',
    name: '',
    description: '',
    permissionIds: [] as number[],
  });

  const rolesQuery = useQuery({
    queryKey: ['roles', orgUuid],
    queryFn: () => fetchRoles(orgUuid!),
    enabled: Boolean(orgUuid),
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions', orgUuid],
    queryFn: () => fetchPermissions(orgUuid!),
    enabled: Boolean(orgUuid),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateRolePermissions(orgUuid!, selectedRoleId!, selectedPermissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', orgUuid] });
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createRole(orgUuid!, {
        code: createForm.code,
        name: createForm.name,
        description: createForm.description || undefined,
        permissionIds: createForm.permissionIds,
      }),
    onSuccess: () => {
      setCreateForm({ code: '', name: '', description: '', permissionIds: [] });
      queryClient.invalidateQueries({ queryKey: ['roles', orgUuid] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRole(orgUuid!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles', orgUuid] }),
    onError: (err: Error) => setError(err.message),
  });

  if (!orgUuid) {
    return <p className="text-slate-500">Select an organization to manage roles.</p>;
  }

  if (!hasPermission('role:manage')) {
    return <p className="text-slate-500">You do not have permission to manage roles.</p>;
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Roles & permissions</h2>
        <p className="text-slate-500">
          Includes content viewer (read-only) and content editor (full access) for the assignment demo.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4"
      >
        <h3 className="font-semibold">Create role</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Code (e.g. auditor)"
            value={createForm.code}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, code: e.target.value.toLowerCase() }))
            }
            pattern="[a-z0-9_]+"
            required
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Display name"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {permissionsQuery.data?.map((permission) => {
            const checked = createForm.permissionIds.includes(permission.id);
            return (
              <label
                key={permission.id}
                className="flex items-start gap-2 rounded-lg border border-slate-100 p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setCreateForm((f) => ({
                      ...f,
                      permissionIds: checked
                        ? f.permissionIds.filter((id) => id !== permission.id)
                        : [...f.permissionIds, permission.id],
                    }));
                  }}
                />
                <span>
                  <span className="font-medium">{permission.code}</span>
                  <span className="mt-0.5 block text-slate-500">{permission.description}</span>
                </span>
              </label>
            );
          })}
        </div>
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-white">
          Create role
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Permissions</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rolesQuery.data?.map((role) => (
              <tr key={role.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{role.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{role.code}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((p) => (
                      <span key={p.id} className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                        {p.code}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">{role.userCount ?? 0}</td>
                <td className="px-4 py-3">
                  {role.organizationId !== null && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="text-teal-700 hover:underline"
                        onClick={() => {
                          setSelectedRoleId(role.id);
                          setSelectedPermissionIds(role.permissions.map((p) => p.id));
                        }}
                      >
                        Edit permissions
                      </button>
                      {!role.isSystem && (
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          onClick={() => {
                            if (window.confirm(`Delete role ${role.name}?`)) {
                              deleteMutation.mutate(role.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRoleId !== null && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold">
            Edit permissions — {rolesQuery.data?.find((r) => r.id === selectedRoleId)?.name}
          </h3>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {permissionsQuery.data?.map((permission) => {
              const checked = selectedPermissionIds.includes(permission.id);
              return (
                <label key={permission.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedPermissionIds((ids) =>
                        checked
                          ? ids.filter((id) => id !== permission.id)
                          : [...ids, permission.id],
                      );
                    }}
                  />
                  <span>
                    <span className="font-medium">{permission.code}</span>
                    <span className="mt-0.5 block text-slate-500">{permission.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="rounded-lg bg-teal-700 px-4 py-2 text-white"
              onClick={() => saveMutation.mutate()}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-4 py-2"
              onClick={() => setSelectedRoleId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
