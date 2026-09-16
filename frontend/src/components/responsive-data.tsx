import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500 sm:text-base">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">{actions}</div>
      ) : null}
    </div>
  );
}

type DataCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: Array<{ label: string; value: ReactNode }>;
  actions?: ReactNode;
};

/** Mobile-first stacked record card (shown below `md`). */
export function DataCard({ title, subtitle, meta, actions }: DataCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100">
      <div className="min-w-0">
        <h3 className="truncate font-medium text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {meta && meta.length > 0 ? (
        <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm">
          {meta.map((row) => (
            <div key={row.label} className="flex gap-3">
              <dt className="w-24 shrink-0 text-slate-500">{row.label}</dt>
              <dd className="min-w-0 flex-1 break-words text-slate-800">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {actions ? (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3">{actions}</div>
      ) : null}
    </article>
  );
}

export function MobileCardList({ children }: { children: ReactNode }) {
  return <div className="space-y-3 md:hidden">{children}</div>;
}

/** Desktop table wrapper: horizontal scroll when needed. */
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-3 hidden overflow-x-auto overscroll-x-contain border-y border-slate-200 bg-white sm:mx-0 sm:rounded-2xl sm:border md:block">
      <div className="inline-block min-w-full align-middle">{children}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
