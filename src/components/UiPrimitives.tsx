'use client';

import { useState, type ReactNode } from 'react';
import { STATUS_STYLES, type BankAccount } from '@/lib/constants';
import type { ContributionStatus } from '@/lib/validation';

export function StatCard({
  label,
  value,
  hint,
  accent = 'emerald',
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'emerald' | 'amber' | 'slate' | 'rose';
}) {
  const accentBar = {
    emerald: 'border-t-emerald-600',
    amber: 'border-t-amber-500',
    slate: 'border-t-slate-700',
    rose: 'border-t-rose-500',
  }[accent];

  return (
    <div className={`rounded-2xl border border-slate-200 border-t-4 ${accentBar} bg-white p-5 shadow-sm transition hover:shadow-md`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: ContributionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

export function ProgressBar({ current, goal }: { current: number; goal: number }) {
  const pct = Math.min(100, Math.max(0, goal > 0 ? Math.round((current / goal) * 100) : 0));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
        <span>{pct}% funded</span>
        <span>{pct >= 100 ? 'Goal Reached!' : `${100 - pct}% remaining`}</span>
      </div>
      <div className="h-3.5 w-full overflow-hidden rounded-full bg-emerald-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function CopyBankCard({
  bank,
  selected,
  onSelect,
}: {
  bank: BankAccount;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bank.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      onClick={() => onSelect?.(bank.id)}
      className={`cursor-pointer rounded-xl border p-4 transition ${
        selected
          ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
          : 'border-slate-200 bg-white hover:border-emerald-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${bank.badgeColor}`}>
            {bank.id}
          </span>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">{bank.name}</p>
          <p className="text-xs text-slate-500">{bank.accountHolder}</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-emerald-600 hover:text-white"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="mt-2 font-mono text-sm font-bold tracking-wide text-slate-800">
        {bank.accountNumber}
      </p>
    </div>
  );
}

export function AlertBanner({
  variant,
  children,
}: {
  variant: 'error' | 'success' | 'info';
  children: ReactNode;
}) {
  const styles = {
    error: 'border-rose-200 bg-rose-50 text-rose-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  }[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles}`}
    >
      {children}
    </div>
  );
}