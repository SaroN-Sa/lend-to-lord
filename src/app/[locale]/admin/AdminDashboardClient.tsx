'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatEthiopianDay, formatEthiopianMonth } from '@/lib/ethiopian-calendar';

export interface AdminContributionRow {
  id: string;
  amount_birr: number;
  kind: 'partner' | 'sponsor';
  method: 'telebirr' | 'bank';
  reference_no: string;
  source: 'web' | 'telegram';
  ethiopian_month: string;
  status: 'counted' | 'voided';
  void_reason: string | null;
  voided_at: string | null;
  note: string | null;
  created_at: string;
  contributor_name: string | null;
  contributor_phone: string | null;
  member: {
    id: string;
    full_name: string;
    phone: string | null;
  } | null;
}

export default function AdminDashboardClient({
  locale,
  adminName,
  selectedMonth,
  contributions,
}: {
  locale: string;
  adminName: string;
  selectedMonth: string;
  contributions: AdminContributionRow[];
}) {
  const router = useRouter();
  const [monthFilter, setMonthFilter] = useState(selectedMonth);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const countedRows = contributions.filter((c) => c.status === 'counted');
  const totalCountedBirr = countedRows.reduce((sum, c) => sum + Number(c.amount_birr), 0);

  async function handleViewReceipt(id: string) {
    setErrorMsg(null);
    setLoadingReceiptId(id);
    try {
      const res = await fetch(`/api/admin/contributions/${id}/receipt`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setErrorMsg(data.error || 'Could not load receipt');
      } else {
        setReceiptModalUrl(data.url);
      }
    } catch {
      setErrorMsg('Failed to fetch signed receipt URL');
    } finally {
      setLoadingReceiptId(null);
    }
  }

  async function handleVoid(id: string, refNo: string, amount: number) {
    const reason = window.prompt(
      locale === 'am'
        ? `የ${amount.toLocaleString()} ብር (${refNo}) አስተዋጽኦ የሚሰረዝበትን ምክንያት ይጻፉ፦`
        : `Enter the reason for voiding ${amount.toLocaleString()} ETB (Ref: ${refNo}):`
    );
    if (!reason || reason.trim().length < 3) return;

    setErrorMsg(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/contributions/${id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to void contribution');
      } else {
        router.refresh();
      }
    } catch {
      setErrorMsg('Network error while voiding contribution');
    } finally {
      setBusyId(null);
    }
  }

  async function handleMoveMonth(id: string, currentMonth: string) {
    const newMonth = window.prompt(
      locale === 'am'
        ? `ይህንን አስተዋጽኦ ወደ የትኛው የኢትዮጵያ ወር ይዛወር? (YYYY-MM)`
        : `Enter the Ethiopian month (YYYY-MM) to move this contribution to:`,
      currentMonth
    );
    if (!newMonth || newMonth.trim() === currentMonth) return;

    setErrorMsg(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/contributions/${id}/month`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ethiopian_month: newMonth.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update month');
      } else {
        router.refresh();
      }
    } catch {
      setErrorMsg('Network error while moving month');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSignOut() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push(`/${locale}/admin/login`);
    router.refresh();
  }

  function applyMonthFilter(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/${locale}/admin?month=${encodeURIComponent(monthFilter.trim())}`);
  }

  return (
    <main className="space-y-6">
      {/* Top Admin Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4332] dark:text-emerald-400">
            {locale === 'am' ? 'የአስተዳዳሪ መቆጣጠሪያ' : 'Admin Dashboard'}
          </h1>
          <p className="text-xs text-stone-500">
            {locale === 'am' ? `እንኳን ደህና መጡ፣ ${adminName}` : `Signed in as ${adminName}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${locale}/admin/updates`}
            className="px-3.5 py-2 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-slate-800"
          >
            {locale === 'am' ? 'ወርሃዊ መልእክቶች' : 'Monthly Updates'}
          </Link>
          <Link
            href={`/${locale}/admin/reports?month=${selectedMonth}`}
            className="px-3.5 py-2 rounded-lg bg-[#1B4332] text-white text-xs font-semibold hover:bg-[#143325]"
          >
            {locale === 'am' ? 'ሂሳብ ማመሳከሪያ እና ሪፖርት' : 'Reconcile & Export CSV'}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {locale === 'am' ? 'ውጣ' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Month Filter & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <form onSubmit={applyMonthFilter} className="flex gap-2">
          <input
            type="text"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            placeholder="2019-03"
            className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm tabular-nums"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-stone-800 text-white text-xs font-semibold shrink-0"
          >
            {locale === 'am' ? 'ቀይር' : 'Filter'}
          </button>
        </form>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-4">
          <p className="text-xs text-stone-500">{formatEthiopianMonth(selectedMonth, locale)}</p>
          <p className="text-xl font-bold tabular-nums text-[#1B4332] dark:text-emerald-400">
            {totalCountedBirr.toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-4">
          <p className="text-xs text-stone-500">
            {locale === 'am' ? 'የተቆጠሩ አስተዋጽኦዎች' : 'Counted Contributions'}
          </p>
          <p className="text-xl font-bold tabular-nums">
            {countedRows.length}{' '}
            <span className="text-xs font-normal text-stone-400">
              ({contributions.length - countedRows.length} voided)
            </span>
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-100 text-red-900 border border-red-300 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Contributions Table */}
      <div className="overflow-x-auto rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/50 text-xs uppercase text-stone-500">
            <tr>
              <th className="p-3.5">{locale === 'am' ? 'ቀን' : 'Date'}</th>
              <th className="p-3.5">{locale === 'am' ? 'አስተዋጽኦ አድራጊ' : 'Contributor'}</th>
              <th className="p-3.5">{locale === 'am' ? 'መጠን (ETB)' : 'Amount'}</th>
              <th className="p-3.5">{locale === 'am' ? 'መንገድ / ቁጥር' : 'Method / Ref'}</th>
              <th className="p-3.5">{locale === 'am' ? 'ሁኔታ' : 'Status'}</th>
              <th className="p-3.5 text-right">{locale === 'am' ? 'እርምጃ' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-slate-800">
            {contributions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-stone-500">
                  {locale === 'am'
                    ? 'በዚህ ወር የተመዘገበ አስተዋጽኦ የለም።'
                    : 'No contributions recorded for this month.'}
                </td>
              </tr>
            ) : (
              contributions.map((c) => {
                const displayName =
                  c.member?.full_name || c.contributor_name || (locale === 'am' ? 'ያልተመዘገበ' : 'Unregistered');
                const displayPhone = c.member?.phone || c.contributor_phone || '—';
                const isVoided = c.status === 'voided';

                return (
                  <tr
                    key={c.id}
                    className={isVoided ? 'opacity-50 bg-stone-50/60 dark:bg-slate-900/40' : ''}
                  >
                    <td className="p-3.5 whitespace-nowrap text-xs">
                      <div>{formatEthiopianDay(c.created_at, locale)}</div>
                      <div className="text-stone-400">
                        {c.source === 'telegram' ? 'Telegram 🤖' : 'Web 🌐'} • {c.ethiopian_month}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-medium">{displayName}</div>
                      <div className="text-xs text-stone-500 tabular-nums">{displayPhone}</div>
                      {c.note && <div className="text-xs text-amber-700 mt-0.5">“{c.note}”</div>}
                    </td>

                    <td className="p-3.5 font-bold tabular-nums whitespace-nowrap">
                      <span className={isVoided ? 'line-through' : ''}>
                        {Number(c.amount_birr).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>{' '}
                      <span className="text-xs font-normal text-stone-500">({c.kind})</span>
                    </td>

                    <td className="p-3.5">
                      <div className="text-xs font-semibold uppercase">{c.method}</div>
                      <div className="text-xs font-mono text-stone-600 dark:text-slate-400">
                        {c.reference_no}
                      </div>
                    </td>

                    <td className="p-3.5">
                      {isVoided ? (
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            {locale === 'am' ? 'የተሰረዘ (Voided)' : 'Voided'}
                          </span>
                          {c.void_reason && (
                            <p className="text-xs text-red-700 mt-1 max-w-xs">{c.void_reason}</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {locale === 'am' ? 'የተቆጠረ' : 'Counted'}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleViewReceipt(c.id)}
                        disabled={loadingReceiptId === c.id}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-slate-800"
                      >
                        {loadingReceiptId === c.id
                          ? '...'
                          : locale === 'am'
                          ? 'ደረሰኝ 🧾'
                          : 'Receipt 🧾'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveMonth(c.id, c.ethiopian_month)}
                        disabled={busyId === c.id}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs hover:bg-stone-100 dark:hover:bg-slate-800"
                        title="Change Ethiopian Month"
                      >
                        {locale === 'am' ? 'ወር ቀይር' : 'Move Month'}
                      </button>

                      {!isVoided && (
                        <button
                          type="button"
                          onClick={() => handleVoid(c.id, c.reference_no, Number(c.amount_birr))}
                          disabled={busyId === c.id}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                        >
                          {locale === 'am' ? 'ሰርዝ (Void)' : 'Void'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Private Receipt Signed-URL Modal */}
      {receiptModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setReceiptModalUrl(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold">
                {locale === 'am' ? 'የደረሰኝ ፎቶ (ለ60 ሰከንድ ብቻ የሚቆይ)' : 'Private Receipt (60s Signed URL)'}
              </h3>
              <button
                type="button"
                onClick={() => setReceiptModalUrl(null)}
                className="text-xs font-bold px-2.5 py-1 rounded bg-stone-200 dark:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex justify-center bg-stone-100 dark:bg-slate-950 rounded-xl p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptModalUrl}
                alt="Transfer Receipt"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}