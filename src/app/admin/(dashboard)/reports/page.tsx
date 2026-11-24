'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  formatBirr,
  formatShortDate,
  toCsv,
  type ContributionRecord,
} from '@/lib/validation';
import { AlertBanner, StatCard, StatusBadge } from '@/components/UiPrimitives';

export default function AdminReportsPage() {
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/contributions?status=${encodeURIComponent(statusFilter)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load reports');
        return body;
      })
      .then((data) => {
        if (active) {
          setRecords(data.records || []);
          setError('');
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Error loading report');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const metrics = useMemo(() => {
    const byBank: Record<string, number> = {};
    let totalBirr = 0;
    let approvedBirr = 0;
    let pendingCount = 0;

    for (const r of records) {
      const amt = Number(r.amount_birr || 0);
      totalBirr += amt;
      if (r.status === 'approved') approvedBirr += amt;
      if (r.status === 'pending') pendingCount += 1;
      byBank[r.bank_name] = (byBank[r.bank_name] || 0) + amt;
    }

    const bankBreakdown = Object.entries(byBank).sort((a, b) => b[1] - a[1]);
    return { totalBirr, approvedBirr, pendingCount, bankBreakdown };
  }, [records]);

  function handleExportCsv() {
    const csv = toCsv(records as unknown as Record<string, unknown>[], [
      { key: 'created_at', label: 'Date' },
      { key: 'donor_name', label: 'Donor' },
      { key: 'bank_name', label: 'Bank' },
      { key: 'reference_no', label: 'Reference' },
      { key: 'amount_birr', label: 'Amount (ETB)' },
      { key: 'status', label: 'Status' },
    ]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lend-to-lord-report-${statusFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <Link href="/admin" className="text-xs font-semibold text-emerald-700 hover:underline">
            ← Back to Verification Console
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Financial Reports</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved Only</option>
            <option value="pending">Pending Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Print PDF
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={records.length === 0}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Volume" value={formatBirr(metrics.totalBirr)} accent="slate" />
        <StatCard label="Approved Funds" value={formatBirr(metrics.approvedBirr)} accent="emerald" />
        <StatCard label="Pending Review" value={metrics.pendingCount} accent="amber" />
      </section>

      {/* Bank Channel Breakdown Chart */}
      {metrics.bankBreakdown.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Breakdown by Payment Channel</h2>
          <div className="space-y-3">
            {metrics.bankBreakdown.map(([bank, amount]) => {
              const pct = metrics.totalBirr > 0 ? Math.round((amount / metrics.totalBirr) * 100) : 0;
              return (
                <div key={bank} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{bank}</span>
                    <span>{formatBirr(amount)} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Donor</th>
              <th className="px-4 py-3">Bank</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading report...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No records found.</td></tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatShortDate(r.created_at)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.donor_name}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-600">{r.bank_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.reference_no}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{formatBirr(r.amount_birr)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
