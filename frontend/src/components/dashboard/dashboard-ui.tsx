import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'muted';
};

const toneClass: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-slate-900',
  good: 'text-teal-700',
  warn: 'text-orange-600',
  muted: 'text-slate-500',
};

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  const isNumeric = typeof value === 'number' || (typeof value === 'string' && /^[\d.%—–-]+$/.test(value));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:rounded-2xl sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-2 font-semibold ${isNumeric ? 'text-2xl tabular-nums sm:text-3xl' : 'text-lg leading-snug sm:text-xl'} ${toneClass[tone]}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

type PanelProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardPanel({ title, subtitle, children, className = '' }: PanelProps) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100 sm:rounded-2xl sm:p-5 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyChartNote({ message }: { message: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
      {message}
    </div>
  );
}

export const CHART_COLORS = ['#0f766e', '#ea580c', '#334155', '#0ea5e9', '#b45309', '#64748b', '#115e59'];
