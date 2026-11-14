'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getEthiopianDateParts, formatEthiopianMonth } from '@/lib/ethiopian-calendar';

export default function AdminUpdatesPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'am';

  const [ethMonth, setEthMonth] = useState(() => getEthiopianDateParts().monthKey);
  const [titleAm, setTitleAm] = useState('');
  const [bodyAm, setBodyAm] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [published, setPublished] = useState(true);

  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    if (!/^\d{4}-(0[1-9]|1[0-3])$/.test(ethMonth)) return;
    fetch(`/api/admin/updates?month=${ethMonth}`)
      .then((r) => r.json())
      .then(({ update }) => {
        if (update) {
          setTitleAm(update.title_am || '');
          setBodyAm(update.body_am || '');
          setTitleEn(update.title_en || '');
          setBodyEn(update.body_en || '');
          setPublished(Boolean(update.published));
        } else {
          setTitleAm('');
          setBodyAm('');
          setTitleEn('');
          setBodyEn('');
          setPublished(true);
        }
      });
  }, [ethMonth]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSaving(true);

    try {
      const res = await fetch('/api/admin/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ethiopian_month: ethMonth,
          title_am: titleAm,
          body_am: bodyAm,
          title_en: titleEn,
          body_en: bodyEn,
          published,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.error || 'Failed to save update' });
      } else {
        setStatus({
          type: 'success',
          msg:
            locale === 'am'
              ? `የ${formatEthiopianMonth(ethMonth, 'am')} ወርሃዊ መልእክት ተቀምጧል!`
              : `Monthly update for ${formatEthiopianMonth(ethMonth, 'en')} saved!`,
        });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSendRemindersNow() {
    const confirmed = window.confirm(
      locale === 'am'
        ? `ለሁሉም የተገናኙ አባላት የ${formatEthiopianMonth(ethMonth, 'am')} ወርሃዊ ማስታወሻ በቴሌግራም ይላክ?`
        : `Send the ${formatEthiopianMonth(ethMonth, 'en')} monthly reminder on Telegram to all connected members now?`
    );
    if (!confirmed) return;

    setSendingReminders(true);
    setStatus(null);
    try {
      const res = await fetch('/api/cron/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, target_month: ethMonth }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus({ type: 'error', msg: data.error || 'Failed to send reminders' });
      } else {
        setStatus({
          type: 'success',
          msg:
            locale === 'am'
              ? `ወርሃዊ ማስታወሻ ለ ${data.sent} አባላት በቴሌግራም ተልኳል!`
              : `Monthly reminder sent to ${data.sent} members on Telegram!`,
        });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Network error while sending reminders' });
    } finally {
      setSendingReminders(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4332] dark:text-emerald-400">
            {locale === 'am' ? 'ወርሃዊ መልእክት ማዘጋጃ' : 'Write Monthly Update'}
          </h1>
          <p className="text-xs text-stone-500">
            {formatEthiopianMonth(ethMonth, locale)} ({ethMonth})
          </p>
        </div>

        <Link
          href={`/${locale}/update/${ethMonth}`}
          className="px-3.5 py-2 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-slate-800"
        >
          {locale === 'am' ? 'ገጹን ተመልከት ↗' : 'Preview Public Page ↗'}
        </Link>
      </div>

      {status && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${
            status.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}
        >
          {status.msg}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-6 space-y-4 shadow-sm"
      >
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            {locale === 'am' ? 'የኢትዮጵያ ወር (YYYY-MM)' : 'Ethiopian Month (YYYY-MM)'}
          </label>
          <input
            type="text"
            value={ethMonth}
            onChange={(e) => setEthMonth(e.target.value)}
            placeholder="2019-03"
            className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2 text-sm tabular-nums"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">ርዕስ (Amharic Title)</label>
          <input
            type="text"
            value={titleAm}
            onChange={(e) => setTitleAm(e.target.value)}
            placeholder="የኅዳር ወር መልእክት እና ራዕይ"
            className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">የአማርኛ መልእክት (Amharic Body)</label>
          <textarea
            rows={4}
            value={bodyAm}
            onChange={(e) => setBodyAm(e.target.value)}
            className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5 pt-2 border-t border-stone-200 dark:border-slate-800">
          <label className="block text-sm font-medium">English Title</label>
          <input
            type="text"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            placeholder="Hidar Monthly Vision & Update"
            className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">English Body</label>
          <textarea
            rows={4}
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="rounded border-stone-300"
          />
          <span>
            {locale === 'am'
              ? 'ለሕዝብ ይታይ (Published)'
              : 'Published (visible on public page & ready for Telegram reminder)'}
          </span>
        </label>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#1B4332] hover:bg-[#143325] disabled:opacity-50 text-white font-semibold transition"
          >
            {saving
              ? locale === 'am'
                ? 'በማስቀመጥ ላይ...'
                : 'Saving...'
              : locale === 'am'
              ? 'መልእክቱን አስቀምጥ'
              : 'Save Monthly Update'}
          </button>

          <button
            type="button"
            onClick={handleSendRemindersNow}
            disabled={sendingReminders}
            className="py-3 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold transition"
          >
            {sendingReminders
              ? locale === 'am'
                ? 'በመላክ ላይ...'
                : 'Sending...'
              : locale === 'am'
              ? 'ማስታወሻ በቴሌግራም ላክ'
              : 'Send Telegram Reminder'}
          </button>
        </div>
      </form>
    </main>
  );
}