import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <ModalShell titleId={titleId} onBackdrop={onCancel}>
      <h3 id={titleId} className="text-lg font-semibold text-slate-900">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          ref={cancelRef}
          type="button"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
            tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-700 hover:bg-teal-800'
          }`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

type PromptModalProps = {
  open: boolean;
  title: string;
  message?: string;
  label?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

export function PromptModal({
  open,
  title,
  message,
  label = 'Name',
  initialValue = '',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, initialValue, onCancel]);

  if (!open) return null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = value.trim();
    if (!next) return;
    onConfirm(next);
  }

  return (
    <ModalShell titleId={titleId} onBackdrop={onCancel}>
      <h3 id={titleId} className="text-lg font-semibold text-slate-900">
        {title}
      </h3>
      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">{label}</span>
          <input
            ref={inputRef}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  titleId,
  onBackdrop,
  children,
}: {
  titleId: string;
  onBackdrop: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/50"
        aria-label="Close dialog"
        onClick={onBackdrop}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/20"
      >
        {children}
      </div>
    </div>
  );
}
