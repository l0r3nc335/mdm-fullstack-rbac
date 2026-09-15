import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ConfirmModal } from '../components/confirm-modal';
import {
  emptyProfileForm,
  ProfileForm,
  profileToForm,
} from '../components/profile-form';
import { useAppSelector, useOrgUuid, usePermissions } from '../hooks/redux';
import {
  createContent,
  deleteAvatar,
  deleteContent,
  fetchAvatarBlob,
  fetchContent,
  fetchContentCandidates,
  updateContent,
  uploadAvatar,
} from '../lib/services';
import type { ContentItem, ProfileUpdatePayload } from '../types/api';

export function ContentPage() {
  const orgUuid = useOrgUuid();
  const user = useAppSelector((s) => s.auth.user);
  const queryClient = useQueryClient();
  const { hasPermission, hasRole } = usePermissions();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ProfileUpdatePayload>(emptyProfileForm);
  const [createUserId, setCreateUserId] = useState('');
  const [createTitle, setCreateTitle] = useState('');
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState(false);

  const contentQuery = useQuery({
    queryKey: ['content', orgUuid],
    queryFn: () => fetchContent(orgUuid!),
    enabled: Boolean(orgUuid) && hasPermission('content:read'),
  });

  const candidatesQuery = useQuery({
    queryKey: ['content-candidates', orgUuid],
    queryFn: () => fetchContentCandidates(orgUuid!),
    enabled: Boolean(orgUuid) && hasPermission('content:write'),
  });

  const items = contentQuery.data ?? [];
  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const canWriteSelected =
    hasPermission('content:write') &&
    Boolean(
      selected &&
        (selected.userId === user?.id ||
          hasRole('admin') ||
          hasRole('super_admin') ||
          hasRole('content_editor')),
    );

  const canCreate = hasPermission('content:write') && (candidatesQuery.data?.length ?? 0) > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [
        item.title,
        item.jobTitle,
        item.department,
        item.phone,
        item.employmentType,
        item.user?.firstName,
        item.user?.lastName,
        item.user?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  useEffect(() => {
    if (selected) {
      setForm(profileToForm(selected));
    }
  }, [selected]);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;

    async function loadAvatar() {
      if (!orgUuid || !selected?.hasAvatar) {
        setAvatarObjectUrl(null);
        return;
      }
      try {
        const blob = await fetchAvatarBlob(orgUuid, selected.id);
        objectUrl = URL.createObjectURL(blob);
        if (!revoked) setAvatarObjectUrl(objectUrl);
      } catch {
        if (!revoked) setAvatarObjectUrl(null);
      }
    }

    void loadAvatar();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orgUuid, selected?.id, selected?.hasAvatar, selected?.avatarUrl]);

  const saveMutation = useMutation({
    mutationFn: () => updateContent(orgUuid!, selected!.id, form),
    onSuccess: () => {
      setMessage('Content saved');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'me', orgUuid] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setMessage(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createContent(orgUuid!, {
        userId: Number(createUserId),
        title: createTitle,
      }),
    onSuccess: (created) => {
      setCreateUserId('');
      setCreateTitle('');
      setSelectedId(created.id);
      setMessage('Content item created');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
      queryClient.invalidateQueries({ queryKey: ['content-candidates', orgUuid] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteContent(orgUuid!, selected!.id),
    onSuccess: () => {
      setSelectedId(null);
      setMessage('Content item deleted');
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
      queryClient.invalidateQueries({ queryKey: ['content-candidates', orgUuid] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'me', orgUuid] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const avatarMutation = useMutation({
    mutationFn: async (payload: { blob: Blob; fileName: string }) =>
      uploadAvatar(orgUuid!, selected!.id, payload.blob, payload.fileName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
      setMessage('Avatar updated');
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: () => deleteAvatar(orgUuid!, selected!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
      setMessage('Avatar removed');
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!orgUuid) {
    return <p className="text-slate-500">Select an organization to view content items.</p>;
  }

  if (!hasPermission('content:read')) {
    return <p className="text-slate-500">You do not have permission to view content.</p>;
  }

  if (contentQuery.isLoading) {
    return <p className="text-slate-500">Loading content…</p>;
  }

  function onSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    saveMutation.mutate();
  }

  function personName(item: ContentItem) {
    if (item.user) return `${item.user.firstName} ${item.user.lastName}`;
    return item.title;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Content</h2>
          <p className="text-slate-500">
            Role-scoped directory of content records. Your own editable profile lives under Profile.
          </p>
        </div>
        <input
          className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          placeholder="Search name, job, department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {canCreate && (
        <form
          className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            createMutation.mutate();
          }}
        >
          <select
            className="rounded-lg border border-slate-200 px-3 py-2"
            value={createUserId}
            onChange={(e) => {
              const nextId = e.target.value;
              setCreateUserId(nextId);
              const candidate = candidatesQuery.data?.find((c) => String(c.id) === nextId);
              if (candidate) {
                setCreateTitle(`${candidate.firstName} ${candidate.lastName} Profile`);
              }
            }}
            required
          >
            <option value="">Select user without content</option>
            {candidatesQuery.data?.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.firstName} {candidate.lastName} ({candidate.email})
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-slate-200 px-3 py-2"
            placeholder="Content title"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            required
          />
          <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-white">
            Create content
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Person</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Job</th>
              <th className="px-4 py-3 font-semibold">Department</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Avatar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No content records in your current scope.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isActive = item.id === selectedId;
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer border-b border-slate-100 transition hover:bg-teal-50/60 ${
                      isActive ? 'bg-teal-50' : ''
                    }`}
                    onClick={() => {
                      setSelectedId(item.id);
                      setError(null);
                      setMessage(null);
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {personName(item)}
                      {item.userId === user?.id ? (
                        <span className="ml-2 text-xs font-normal text-teal-700">(you)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.title}</td>
                    <td className="px-4 py-3 text-slate-600">{item.jobTitle ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.department ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{item.phone ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {item.employmentType?.replace(/_/g, ' ') ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.hasAvatar ? 'Yes' : 'No'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-slate-500">
        Showing {filtered.length} of {items.length} record{items.length === 1 ? '' : 's'}.
        Click a row to view or edit details.
      </p>

      {selected && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">
              Record detail · {personName(selected)}
            </h3>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => setSelectedId(null)}
            >
              Close
            </button>
          </div>
          <ProfileForm
            form={form}
            canEdit={canWriteSelected}
            avatarUrl={avatarObjectUrl}
            hasAvatar={selected.hasAvatar}
            isSaving={saveMutation.isPending}
            error={error}
            message={message}
            submitLabel="Save content"
            onChange={setForm}
            onSubmit={onSave}
            onUploadFile={async (file) => {
              await avatarMutation.mutateAsync({ blob: file, fileName: file.name });
            }}
            onUploadBlob={async (blob, fileName) => {
              await avatarMutation.mutateAsync({ blob, fileName });
            }}
            onRemoveAvatar={async () => {
              await removeAvatarMutation.mutateAsync();
            }}
            onDelete={canWriteSelected ? () => setPendingDelete(true) : undefined}
          />
        </div>
      )}

      <ConfirmModal
        open={pendingDelete}
        title="Delete content"
        message="Delete this content item? This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setPendingDelete(false)}
        onConfirm={() => {
          setPendingDelete(false);
          deleteMutation.mutate();
        }}
      />
    </div>
  );
}
