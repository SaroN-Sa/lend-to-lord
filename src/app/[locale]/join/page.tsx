'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function JoinPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'am';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'partner' | 'sponsor'>('partner');
  const [prefLang, setPrefLang] = useState<'am' | 'en'>(locale as 'am' | 'en');
  const [showNamePublicly, setShowNamePublicly] = useState(false);

  const [botLinkCode, setBotLinkCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'YourCharityBot';

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          full_name: fullName,
          phone,
          role,
          language: prefLang,
          show_name_publicly: showNamePublicly,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        setBotLinkCode(data.telegram_link_code);
      }
    } catch {
      setError(locale === 'am' ? 'የኔትወርክ ችግር አጋጥሟል።' : 'Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#1B4332] dark:text-emerald-400">
          {locale === 'am' ? 'አጋር ይሁኑ' : 'Become a Partner'}
        </h1>
        <p className="text-sm text-stone-600 dark:text-slate-400">
          {locale === 'am'
            ? 'በየወሩ የቻሉትን መጠን በመስጠት የበጎ አድራጎት ስራውን ይደግፉ።'
            : 'Support the charity each month with whatever amount you choose.'}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-100 text-red-900 border border-red-300 text-sm font-medium">
          {error}
        </div>
      )}

      {botLinkCode ? (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 p-6 space-y-4 text-center">
          <h2 className="text-lg font-bold text-[#1B4332] dark:text-emerald-300">
            {locale === 'am' ? 'ምዝገባዎ ተጠናቋል!' : 'Registration Complete!'}
          </h2>
          <p className="text-sm">
            {locale === 'am'
              ? 'ወርሃዊ ማስታወሻ እና የምስጋና መልእክት በቴሌግራም እንዲደርስዎት ከታች ያለውን ቁልፍ ተጭነው Start ይበሉ፦'
              : 'To receive monthly reminders and thank-you notes on Telegram, press the button below and tap Start:'}
          </p>
          <a
            href={`https://t.me/${botUsername}?start=${botLinkCode}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block px-6 py-3 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-white font-semibold shadow-sm transition"
          >
            {locale === 'am' ? 'ቴሌግራም ቦቱን ያገናኙ' : 'Connect Telegram Bot'}
          </a>
          <p className="text-xs text-stone-500">
            {locale === 'am'
              ? `ወይም በቴሌግራም ቦቱ ላይ ይህንን ይላኩ፦ /start ${botLinkCode}`
              : `Or send this message directly to the bot: /start ${botLinkCode}`}
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleJoin}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-6 space-y-4 shadow-sm"
        >
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              {locale === 'am' ? 'ሙሉ ስም' : 'Full Name'} *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">
              {locale === 'am' ? 'ስልክ ቁጥር' : 'Phone Number'} *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09... / +2519..."
              className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                {locale === 'am' ? 'የአባልነት አይነት' : 'Membership Role'}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'partner' | 'sponsor')}
                className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
              >
                <option value="partner">{locale === 'am' ? 'ወርሃዊ አጋር (Partner)' : 'Monthly Partner'}</option>
                <option value="sponsor">{locale === 'am' ? 'ስፖንሰር (Sponsor)' : 'Sponsor'}</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                {locale === 'am' ? 'የመልእክት ቋንቋ' : 'Message Language'}
              </label>
              <select
                value={prefLang}
                onChange={(e) => setPrefLang(e.target.value as 'am' | 'en')}
                className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
              >
                <option value="am">አማርኛ (Amharic)</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <label className="flex items-start gap-2.5 pt-2 text-xs text-stone-600 dark:text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showNamePublicly}
              onChange={(e) => setShowNamePublicly(e.target.checked)}
              className="mt-0.5 rounded border-stone-300"
            />
            <span>
              {locale === 'am'
                ? 'አስተዋጽኦ ሳደርግ ስሜ በሕዝብ የምስጋና ገጽ ላይ እንዲታይ እፈቅዳለሁ (ካልተመረጠ "አንድ ሰው..." ተብሎ በሚስጥር ይመዘገባል)።'
                : 'Allow my name to be shown publicly on the contribution feed (if unchecked, gifts appear anonymously as "Someone contributed...").'}
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#1B4332] hover:bg-[#143325] disabled:opacity-50 text-white font-semibold transition"
          >
            {submitting
              ? locale === 'am'
                ? 'በመመዝገብ ላይ...'
                : 'Registering...'
              : locale === 'am'
              ? 'ተመዝገብ'
              : 'Join Now'}
          </button>
        </form>
      )}
    </main>
  );
}