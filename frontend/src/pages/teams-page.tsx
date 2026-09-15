import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmModal } from '../components/confirm-modal';
import {
  createTeam,
  deleteTeam,
  fetchTeams,
  fetchUsers,
  updateTeam,
} from '../lib/services';
import { useOrgUuid, usePermissions } from '../hooks/redux';

export function TeamsPage() {
  const orgUuid = useOrgUuid();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [name, setName] = useState('');
  const [managerUserId, setManagerUserId] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editManagerUserId, setEditManagerUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const teamsQuery = useQuery({
    queryKey: ['teams', orgUuid],
    queryFn: () => fetchTeams(orgUuid!),
    enabled: Boolean(orgUuid),
  });

  const usersQuery = useQuery({
    queryKey: ['users', orgUuid],
    queryFn: () => fetchUsers(orgUuid!),
    enabled: Boolean(orgUuid) && hasPermission('team:manage') && hasPermission('user:manage'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createTeam(orgUuid!, {
        name,
        managerUserId: Number(managerUserId),
      }),
    onSuccess: () => {
      setName('');
      setManagerUserId('');
      queryClient.invalidateQueries({ queryKey: ['teams', orgUuid] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateTeam(orgUuid!, editingId!, {
        name: editName,
        managerUserId: Number(editManagerUserId),
      }),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['teams', orgUuid] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTeam(orgUuid!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams', orgUuid] }),
    onError: (err: Error) => setError(err.message),
  });

  if (!orgUuid) {
    return <p className="text-slate-500">Select an organization to manage teams.</p>;
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Teams</h2>
        <p className="text-slate-500">Create, update, and delete teams and their managers.</p>
      </div>

      {hasPermission('team:manage') && (
        <form onSubmit={onCreate} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Team name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={managerUserId}
            onChange={(e) => setManagerUserId(e.target.value)}
            required
          >
            <option value="">Select manager</option>
            {usersQuery.data?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName} ({user.email})
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-white">
            Create team
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Manager</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teamsQuery.data?.map((team) => (
              <tr key={team.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">
                  {editingId === team.id ? (
                    <input
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    team.name
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === team.id ? (
                    <select
                      className="w-full rounded-lg border border-slate-200 px-2 py-1"
                      value={editManagerUserId}
                      onChange={(e) => setEditManagerUserId(e.target.value)}
                    >
                      {usersQuery.data?.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                    </select>
                  ) : team.manager ? (
                    `${team.manager.firstName} ${team.manager.lastName}`
                  ) : (
                    team.managerUserId
                  )}
                </td>
                <td className="px-4 py-3">{team._count?.members ?? '—'}</td>
                <td className="px-4 py-3">
                  {hasPermission('team:manage') && (
                    <div className="flex flex-wrap gap-3">
                      {editingId === team.id ? (
                        <>
                          <button
                            type="button"
                            className="text-teal-700 hover:underline"
                            onClick={() => {
                              setError(null);
                              updateMutation.mutate();
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="text-slate-500 hover:underline"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="text-teal-700 hover:underline"
                          onClick={() => {
                            setEditingId(team.id);
                            setEditName(team.name);
                            setEditManagerUserId(String(team.managerUserId));
                          }}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => setDeleteTarget({ id: team.id, name: team.name })}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete team"
        message={`Delete ${deleteTarget?.name ?? 'this team'}? This cannot be undone.`}
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
