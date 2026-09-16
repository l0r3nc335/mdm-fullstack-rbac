import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  emptyProfileForm,
  ProfileForm,
  profileToForm,
} from '../components/profile-form';
import { PageHeader } from '../components/responsive-data';
import { useOrgUuid, usePermissions } from '../hooks/redux';
import {
  deleteAvatar,
  fetchAvatarBlob,
  fetchMyContent,
  updateContent,
  uploadAvatar,
} from '../lib/services';
import type { ProfileUpdatePayload } from '../types/api';

export function ProfilePage() {
  const orgUuid = useOrgUuid();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [form, setForm] = useState<ProfileUpdatePayload>(emptyProfileForm);
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['profile', 'me', orgUuid],
    queryFn: () => fetchMyContent(orgUuid!),
    enabled: Boolean(orgUuid) && hasPermission('content:read'),
  });

  const canEdit = hasPermission('content:write');
  const profile = profileQuery.data ?? null;

  useEffect(() => {
    if (profile) {
      setForm(profileToForm(profile));
    }
  }, [profile]);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;

    async function loadAvatar() {
      if (!orgUuid || !profile?.hasAvatar) {
        setAvatarObjectUrl(null);
        return;
      }
      try {
        const blob = await fetchAvatarBlob(orgUuid, profile.id);
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
  }, [orgUuid, profile?.id, profile?.hasAvatar, profile?.avatarUrl]);

  const saveMutation = useMutation({
    mutationFn: () => updateContent(orgUuid!, profile!.id, form),
    onSuccess: () => {
      setMessage('Profile saved');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me', orgUuid] });
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setMessage(null);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async (payload: { blob: Blob; fileName: string }) =>
      uploadAvatar(orgUuid!, profile!.id, payload.blob, payload.fileName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me', orgUuid] });
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
      setMessage('Avatar updated');
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: () => deleteAvatar(orgUuid!, profile!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me', orgUuid] });
      queryClient.invalidateQueries({ queryKey: ['content', orgUuid] });
      setMessage('Avatar removed');
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!orgUuid) {
    return <p className="text-slate-500">Select an organization to view your profile.</p>;
  }

  if (!hasPermission('content:read')) {
    return <p className="text-slate-500">You do not have permission to view profiles.</p>;
  }

  if (profileQuery.isLoading) {
    return <p className="text-slate-500">Loading profile…</p>;
  }

  if (profileQuery.isError) {
    return (
      <p className="text-sm text-red-600">
        {(profileQuery.error as Error).message || 'Failed to load profile'}
      </p>
    );
  }

  if (!profile) {
    return <p className="text-slate-500">Loading profile…</p>;
  }

  function onSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    saveMutation.mutate();
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Profile"
        description={`Your personal profile${
          profile.user ? ` · ${profile.user.firstName} ${profile.user.lastName}` : ''
        }.`}
      />

      <ProfileForm
        form={form}
        canEdit={canEdit}
        avatarUrl={avatarObjectUrl}
        hasAvatar={profile.hasAvatar}
        isSaving={saveMutation.isPending}
        error={error}
        message={message}
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
      />
    </div>
  );
}
