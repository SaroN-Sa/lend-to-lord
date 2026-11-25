'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  formatBirr,
  formatShortDate,
  type ContributionRecord,
  type ContributionStatus,
} from '@/lib/validation';
import { AlertBanner, StatCard, StatusBadge } from '@/components/UiPrimitives';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [filter, setFilter] = useState<'all' | ContributionStatus>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchRecords() {
      try {
        const res = await fetch('/api/admin/contributions');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch contributions');
        if (active) {
          setRecords(data.records || []);
          setError('');
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load records');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchRecords();
    return () => {
      active = false;
    };
  }, []);

  async function updateStatus(id: string, status: ContributionStatus) {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/contributions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.donor_name.toLowerCase().includes(q) ||
        r.reference_no.toLowerCase().includes(q) ||
        r.bank_name.toLowerCase().includes(q)
      );
    });
  }, [records, filter, search]);

  const kpis = useMemo(() => {
    return records.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.status === 'pending') acc.pending += 1;
        if (r.status === 'approved') acc.approvedBirr += Number(r.amount_birr || 0);
        if (r.status === 'rejected') acc.rejected += 1;
        return acc;
      },
      { total: 0, pending: 0, approvedBirr: 0, rejected: 0 }
    );
  }, [records]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Admin Verification Console</h1>
          <p className="text-sm text-slate-500">Review bank references, inspect receipts, and approve donations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/content"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Hero & Sponsors
          </Link>
          <Link
            href="/admin/updates"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Monthly Updates
          </Link>
          <Link
            href="/admin/reports"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            View Analytics & Reports →
          </Link>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/admin/auth', { method: 'DELETE' });
              router.push('/admin/login');
              router.refresh();
            }}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition"
          >
            Sign Out
          </button>
        </div>
      </div>

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Approved Funds" value={formatBirr(kpis.approvedBirr)} accent="emerald" />
        <StatCard label="Pending Review" value={kpis.pending} accent="amber" />
        <StatCard label="Total Submissions" value={kpis.total} accent="slate" />
        <StatCard label="Rejected" value={kpis.rejected} accent="rose" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                filter === tab
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Search donor, ref, or bank..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm sm:w-72"
        />
      </div>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Donor</th>
              <th className="px-4 py-3">Bank / Ref</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading submissions...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No matching contributions.</td></tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatShortDate(item.created_at)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {item.donor_name}
                    {item.phone && <div className="text-xs font-normal text-slate-500">{item.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-slate-700">{item.bank_name}</span>
                    <div className="font-mono text-xs text-slate-500">{item.reference_no}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">
                    {formatBirr(item.amount_birr)}
                  </td>
                  <td className="px-4 py-3">
                    {item.receipt_url ? (
                      <button
                        type="button"
                        onClick={() => setPreviewReceipt(item.receipt_url || null)}
                        className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-900"
                      >
                        View Image
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === item.id || item.status === 'approved'}
                        onClick={() => updateStatus(item.id, 'approved')}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id || item.status === 'rejected'}
                        onClick={() => updateStatus(item.id, 'rejected')}
                        className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {previewReceipt && (
        <div
          onClick={() => setPreviewReceipt(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-xl rounded-2xl bg-white p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Transfer Receipt Preview</h2>
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="rounded-lg px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewReceipt}
              alt="Contribution receipt"
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}
