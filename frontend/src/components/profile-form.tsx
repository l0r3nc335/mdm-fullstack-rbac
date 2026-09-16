import { type FormEvent, type ReactNode } from 'react';
import { AvatarPicker } from './avatar-picker';
import type { ProfileUpdatePayload } from '../types/api';

export const emptyProfileForm: ProfileUpdatePayload = {
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

export function profileToForm(item: {
  title: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bio: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  jobTitle: string | null;
  department: string | null;
  employeeNumber: string | null;
  employmentType: string | null;
  startDate: string | null;
}): ProfileUpdatePayload {
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500';

type ProfileFormProps = {
  form: ProfileUpdatePayload;
  canEdit: boolean;
  avatarUrl: string | null;
  hasAvatar: boolean;
  isSaving?: boolean;
  error?: string | null;
  message?: string | null;
  submitLabel?: string;
  onChange: (next: ProfileUpdatePayload) => void;
  onSubmit: (event: FormEvent) => void;
  onUploadFile: (file: File) => Promise<void>;
  onUploadBlob: (blob: Blob, fileName: string) => Promise<void>;
  onRemoveAvatar?: () => Promise<void>;
  onDelete?: () => void;
};

export function ProfileForm({
  form,
  canEdit,
  avatarUrl,
  hasAvatar,
  isSaving,
  error,
  message,
  submitLabel = 'Save profile',
  onChange,
  onSubmit,
  onUploadFile,
  onUploadBlob,
  onRemoveAvatar,
  onDelete,
}: ProfileFormProps) {
  function setField<K extends keyof ProfileUpdatePayload>(key: K, value: ProfileUpdatePayload[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:rounded-2xl sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start">
          <AvatarPicker
            imageUrl={avatarUrl}
            canEdit={canEdit}
            onUploadFile={onUploadFile}
            onUploadBlob={onUploadBlob}
            onRemove={hasAvatar ? onRemoveAvatar : undefined}
          />

          <div className="grid flex-1 gap-3 md:grid-cols-2">
            <Field label="Display title">
              <input
                className={inputClass}
                value={form.title ?? ''}
                disabled={!canEdit}
                onChange={(e) => setField('title', e.target.value)}
                required
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={form.phone ?? ''}
                disabled={!canEdit}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:rounded-2xl sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Biodata</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Date of birth">
            <input
              type="date"
              className={inputClass}
              value={form.dateOfBirth ?? ''}
              disabled={!canEdit}
              onChange={(e) => setField('dateOfBirth', e.target.value)}
            />
          </Field>
          <Field label="Gender">
            <select
              className={inputClass}
              value={form.gender ?? ''}
              disabled={!canEdit}
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
                disabled={!canEdit}
                onChange={(e) => setField('bio', e.target.value)}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:rounded-2xl sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Address</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Street">
              <input
                className={inputClass}
                value={form.street ?? ''}
                disabled={!canEdit}
                onChange={(e) => setField('street', e.target.value)}
              />
            </Field>
          </div>
          <Field label="City">
            <input
              className={inputClass}
              value={form.city ?? ''}
              disabled={!canEdit}
              onChange={(e) => setField('city', e.target.value)}
            />
          </Field>
          <Field label="State / Province">
            <input
              className={inputClass}
              value={form.state ?? ''}
              disabled={!canEdit}
              onChange={(e) => setField('state', e.target.value)}
            />
          </Field>
          <Field label="Postal code">
            <input
              className={inputClass}
              value={form.postalCode ?? ''}
              disabled={!canEdit}
              onChange={(e) => setField('postalCode', e.target.value)}
            />
          </Field>
          <Field label="Country">
            <input
              className={inputClass}
              value={form.country ?? ''}
              disabled={!canEdit}
              onChange={(e) => setField('country', e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:rounded-2xl sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Employment</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Job title">
            <input
              className={inputClass}
              value={form.jobTitle ?? ''}
              disabled={!canEdit}
              onChange={(e) => setField('jobTitle', e.target.value)}
            />
          </Field>
          <Field label="Department">
            <input
              className={inputClass}
              value={form.department ?? ''}
              disabled={!canEdit}
              onChange={(e) => setField('department', e.target.value)}
            />
          </Field>
          <Field label="Employee number">
            <input
              className={inputClass}
              value={form.employeeNumber ?? ''}
              disabled={!canEdit}
              onChange={(e) => setField('employeeNumber', e.target.value)}
            />
          </Field>
          <Field label="Employment type">
            <select
              className={inputClass}
              value={form.employmentType ?? ''}
              disabled={!canEdit}
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
              disabled={!canEdit}
              onChange={(e) => setField('startDate', e.target.value)}
            />
          </Field>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-teal-700">{message}</p> : null}

      <div className="flex flex-wrap gap-3">
        {canEdit ? (
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {isSaving ? 'Saving…' : submitLabel}
          </button>
        ) : (
          <p className="text-sm text-slate-500">You have read-only access to this profile.</p>
        )}
        {canEdit && onDelete ? (
          <button
            type="button"
            className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            Delete content
          </button>
        ) : null}
      </div>
    </form>
  );
}
