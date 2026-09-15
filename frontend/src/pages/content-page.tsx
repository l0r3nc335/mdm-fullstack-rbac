import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AvatarPicker } from '../components/avatar-picker';
import { useAppSelector, useOrgUuid, usePermissions } from '../hooks/redux';
import {
  deleteAvatar,
  fetchAvatarBlob,
  fetchContent,
  updateContent,
  uploadAvatar,
} from '../lib/services';
import type { ContentItem, ProfileUpdatePayload } from '../types/api';

const emptyForm: ProfileUpdatePayload = {
  title: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  bio: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  jobTitle: '',
  department: '',
  employeeNumber: '',
  employmentType: '',
  startDate: '',
};

function toForm(item: ContentItem): ProfileUpdatePayload {
  return {
    title: item.title ?? '',
    phone: item.phone ?? '',
    dateOfBirth: item.dateOfBirth ?? '',
    gender: item.gender ?? '',
    bio: item.bio ?? '',
    street: item.street ?? '',
    city: item.city ?? '',
    state: item.state ?? '',
    postalCode: item.postalCode ?? '',
    country: item.country ?? '',
    jobTitle: item.jobTitle ?? '',
    department: item.department ?? '',
    employeeNumber: item.employeeNumber ?? '',
    employmentType: item.employmentType ?? '',
    startDate: item.startDate ?? '',
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500';

export function ContentPage() {
  const orgUuid = useOrgUuid();
  const user = useAppSelector((s) => s.auth.user);
  const queryClient = useQueryClient();
  const { hasPermission, hasRole } = usePermissions();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ProfileUpdatePayload>(emptyForm);
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isEmployeeLike =
    hasRole('employee') ||
    hasRole('manager') ||
    hasRole('subscriber') ||
    (!hasRole('admin') && !hasRole('super_admin') && !hasRole('content_editor'));

  const contentQuery = useQuery({
    queryKey: ['content', orgUuid],
    queryFn: () => fetchContent(orgUuid!),
    enabled: Boolean(orgUuid) && hasPermission('content:read'),
  });

  const ownProfile = useMemo(
    () => contentQuery.data?.find((item) => item.userId === user?.id) ?? null,
    [contentQuery.data, user?.id],
  );

  const activeProfile = useMemo(() => {
    if (!contentQuery.data?.length) return null;
    if (selectedId) {
      return contentQuery.data.find((item) => item.id === selectedId) ?? null;
    }
    return ownProfile ?? contentQuery.data[0];
  }, [contentQuery.data, selectedId, ownProfile]);

  const canWriteActive =
    hasPermission('content:write') &&
    Boolean(
      activeProfile &&
        (activeProfile.userId === user?.id ||
          hasRole('admin') ||
          hasRole('super_admin') ||
          hasRole('content_editor')),
    );

  useEffect(() => {
    if (activeProfile) {
      setForm(toForm(activeProfile));
    }
  }, [activeProfile]);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;

    async function loadAvatar() {
      if (!orgUuid || !activeProfile?.hasAvatar) {
        setAvatarObjectUrl(null);
        return;
      }
      try {
        const blob = await fetchAvatarBlob(orgUuid, activeProfile.id);
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
  }, [orgUuid, activeProfile?.id, activeProfile?.hasAvatar, activeProfile?.avatarUrl]);

  const saveMutation = useMutation({
    mutationFn: () => updateContent(orgUuid!, activeProfile!.id, form),
    onSuccess: () => {
      setMessage('Profile saved');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setMessage(null);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async (payload: { blob: Blob; fileName: string }) =>
      uploadAvatar(orgUuid!, activeProfile!.id, payload.blob, payload.fileName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
      setMessage('Avatar updated');
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: () => deleteAvatar(orgUuid!, activeProfile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
      setMessage('Avatar removed');
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!orgUuid) {
    return <p className="text-slate-500">Select an organization to view profile content.</p>;
  }

  if (!hasPermission('content:read')) {
    return <p className="text-slate-500">You do not have permission to view content.</p>;
  }

  if (contentQuery.isLoading) {
    return <p className="text-slate-500">Loading profile…</p>;
  }

  if (!activeProfile) {
    return <p className="text-slate-500">No profile content is available for your account.</p>;
  }

  function setField<K extends keyof ProfileUpdatePayload>(key: K, value: ProfileUpdatePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    saveMutation.mutate();
  }

  const showSelector = !isEmployeeLike || (contentQuery.data?.length ?? 0) > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Profile</h2>
          <p className="text-slate-500">
            Biodata, address, and employment information
            {activeProfile.user
              ? ` for ${activeProfile.user.firstName} ${activeProfile.user.lastName}`
              : ''}
            .
          </p>
        </div>

        {showSelector && (contentQuery.data?.length ?? 0) > 1 && (
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            value={activeProfile.id}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {contentQuery.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.user
                  ? `${item.user.firstName} ${item.user.lastName}`
                  : item.title}
                {item.userId === user?.id ? ' (you)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <form onSubmit={onSave} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <AvatarPicker
              imageUrl={avatarObjectUrl}
              canEdit={canWriteActive}
              onUploadFile={async (file) => {
                await avatarMutation.mutateAsync({ blob: file, fileName: file.name });
              }}
              onUploadBlob={async (blob, fileName) => {
                await avatarMutation.mutateAsync({ blob, fileName });
              }}
              onRemove={
                activeProfile.hasAvatar
                  ? async () => {
                      await removeAvatarMutation.mutateAsync();
                    }
                  : undefined
              }
            />

            <div className="grid flex-1 gap-3 md:grid-cols-2">
              <Field label="Display title">
                <input
                  className={inputClass}
                  value={form.title ?? ''}
                  disabled={!canWriteActive}
                  onChange={(e) => setField('title', e.target.value)}
                  required
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputClass}
                  value={form.phone ?? ''}
                  disabled={!canWriteActive}
                  onChange={(e) => setField('phone', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Biodata
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Date of birth">
              <input
                type="date"
                className={inputClass}
                value={form.dateOfBirth ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('dateOfBirth', e.target.value)}
              />
            </Field>
            <Field label="Gender">
              <select
                className={inputClass}
                value={form.gender ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('gender', e.target.value)}
              >
                <option value="">Prefer not to say / unset</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non_binary">Non-binary</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Bio">
                <textarea
                  className={`${inputClass} min-h-28`}
                  value={form.bio ?? ''}
                  disabled={!canWriteActive}
                  onChange={(e) => setField('bio', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Address
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Street">
                <input
                  className={inputClass}
                  value={form.street ?? ''}
                  disabled={!canWriteActive}
                  onChange={(e) => setField('street', e.target.value)}
                />
              </Field>
            </div>
            <Field label="City">
              <input
                className={inputClass}
                value={form.city ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('city', e.target.value)}
              />
            </Field>
            <Field label="State / Province">
              <input
                className={inputClass}
                value={form.state ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('state', e.target.value)}
              />
            </Field>
            <Field label="Postal code">
              <input
                className={inputClass}
                value={form.postalCode ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('postalCode', e.target.value)}
              />
            </Field>
            <Field label="Country">
              <input
                className={inputClass}
                value={form.country ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('country', e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Employment
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Job title">
              <input
                className={inputClass}
                value={form.jobTitle ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('jobTitle', e.target.value)}
              />
            </Field>
            <Field label="Department">
              <input
                className={inputClass}
                value={form.department ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('department', e.target.value)}
              />
            </Field>
            <Field label="Employee number">
              <input
                className={inputClass}
                value={form.employeeNumber ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('employeeNumber', e.target.value)}
              />
            </Field>
            <Field label="Employment type">
              <select
                className={inputClass}
                value={form.employmentType ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('employmentType', e.target.value)}
              >
                <option value="">Unset</option>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </Field>
            <Field label="Start date">
              <input
                type="date"
                className={inputClass}
                value={form.startDate ?? ''}
                disabled={!canWriteActive}
                onChange={(e) => setField('startDate', e.target.value)}
              />
            </Field>
          </div>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-teal-700">{message}</p>}

        {canWriteActive && (
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save profile'}
          </button>
        )}

        {!canWriteActive && (
          <p className="text-sm text-slate-500">
            You have read-only access to this profile.
          </p>
        )}
      </form>
    </div>
  );
}
