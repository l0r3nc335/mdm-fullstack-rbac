import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmModal, PromptModal } from '../components/confirm-modal';
import {
  DataCard,
  MobileCardList,
  PageHeader,
  TableShell,
} from '../components/responsive-data';
import {
  createOrganization,
  deleteOrganization,
  fetchOrganizations,
  updateOrganization,
} from '../lib/services';
import { useAppDispatch, useAppSelector, usePermissions } from '../hooks/redux';
import { setActiveOrganization } from '../store/auth-slice';

export function OrganizationsPage() {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { hasPermission, hasRole } = usePermissions();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ uuid: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ uuid: string; name: string } | null>(null);

  const canCreate = hasRole('super_admin') && hasPermission('org:manage');
  const canDelete = canCreate;
  const canRenameOrg = (orgId: number) =>
    canCreate || (hasRole('admin') && user?.organizationId === orgId);

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
  });

  const createMutation = useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      setName('');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const renameMutation = useMutation({
    mutationFn: ({ uuid, nextName }: { uuid: string; nextName: string }) =>
      updateOrganization(uuid, nextName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => deleteOrganization(uuid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organizations'] }),
    onError: (err: Error) => setError(err.message),
  });

  function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    createMutation.mutate(name);
  }

  function orgActions(org: NonNullable<typeof orgsQuery.data>[number]) {
    return (
      <div className="flex flex-wrap gap-2">
        {(hasRole('super_admin') || user?.organizationId === org.id) && (
          <button
            type="button"
            className="rounded-md bg-slate-900 px-2.5 py-1 text-xs text-white"
            onClick={() =>
              dispatch(
                setActiveOrganization({
                  id: org.id,
                  uuid: org.uuid,
                  name: org.name,
                }),
              )
            }
          >
            Work in org
          </button>
        )}
        {canRenameOrg(org.id) && (
          <button
            type="button"
            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs"
            onClick={() => setRenameTarget({ uuid: org.uuid, name: org.name })}
          >
            Rename
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600"
            onClick={() => setDeleteTarget({ uuid: org.uuid, name: org.name })}
          >
            Delete
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Organizations"
        description="Super admin creates and deletes tenants. Org admins can rename their own organization."
      />

      {canCreate && (
        <form
          onSubmit={onCreate}
          className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:flex-wrap sm:rounded-2xl sm:p-4"
        >
          <input
            className="w-full min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 sm:min-w-[12rem]"
            placeholder="New organization name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-white hover:bg-teal-800 sm:shrink-0"
          >
            Create
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <MobileCardList>
        {orgsQuery.data?.map((org) => (
          <DataCard
            key={org.id}
            title={org.name}
            subtitle={<span className="font-mono text-xs">{org.uuid}</span>}
            meta={[
              { label: 'Users', value: org._count?.users ?? '—' },
              { label: 'Teams', value: org._count?.teams ?? '—' },
            ]}
            actions={orgActions(org)}
          />
        ))}
      </MobileCardList>

      <TableShell>
        <table className="min-w-[44rem] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">UUID</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Teams</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgsQuery.data?.map((org) => (
              <tr key={org.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">{org.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{org.uuid}</td>
                <td className="px-4 py-3">{org._count?.users ?? '—'}</td>
                <td className="px-4 py-3">{org._count?.teams ?? '—'}</td>
                <td className="px-4 py-3">{orgActions(org)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <PromptModal
        open={Boolean(renameTarget)}
        title="Rename organization"
        label="Organization name"
        initialValue={renameTarget?.name ?? ''}
        confirmLabel="Rename"
        onCancel={() => setRenameTarget(null)}
        onConfirm={(nextName) => {
          if (!renameTarget) return;
          renameMutation.mutate({ uuid: renameTarget.uuid, nextName });
          setRenameTarget(null);
        }}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete organization"
        message={`Delete ${deleteTarget?.name ?? 'this organization'} and all of its users, teams, and content? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.uuid);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
