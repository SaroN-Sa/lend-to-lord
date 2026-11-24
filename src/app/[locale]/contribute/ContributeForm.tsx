'use client';

import { useState } from 'react';

export interface PaymentAccount {
  id: string;
  method: 'telebirr' | 'bank';
  account_name: string;
  account_number: string;
  bank_name: string | null;
  qr_code_url: string | null;
}

export default function ContributeForm({
  locale,
  accounts,
}: {
  locale: string;
  accounts: PaymentAccount[];
}) {
  const [kind, setKind] = useState<'partner' | 'sponsor'>('partner');
  const [method, setMethod] = useState<'telebirr' | 'bank'>('telebirr');
  const [amountBirr, setAmountBirr] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [contributorPhone, setContributorPhone] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const filteredAccounts = accounts.filter((acc) => acc.method === method);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amountBirr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(locale === 'am' ? 'እባክዎ ትክክለኛ የገንዘብ መጠን ያስገቡ።' : 'Please enter a valid amount.');
      return;
    }

    if (!referenceNo.trim()) {
      setError(locale === 'am' ? 'እባክዎ የግብይት ማጣቀሻ ቁጥር (Reference No) ያስገቡ።' : 'Reference number is required.');
      return;
    }

    if (!file) {
      setError(locale === 'am' ? 'እባክዎ የክፍያ ደረሰኝ ፎቶ ያያይዙ።' : 'Please upload your payment receipt screenshot.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('kind', kind);
      formData.append('method', method);
      formData.append('amount_birr', amountBirr);
      formData.append('reference_no', referenceNo.trim());
      formData.append('contributor_name', contributorName.trim());
      formData.append('contributor_phone', contributorPhone.trim());
      formData.append('note', note.trim());
      formData.append('screenshot', file);

      const res = await fetch('/api/contribute', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submission failed');
      } else {
        setSuccess(true);
      }
    } catch {
      setError(locale === 'am' ? 'የኔትወርክ ስህተት አጋጥሟል።' : 'Network error occurred.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          ✓
        </div>
        <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-200">
          {locale === 'am' ? 'አስተዋጽኦዎ በትክክል ተመዝግቧል!' : 'Contribution Recorded Successfully!'}
        </h2>
        <p className="text-sm text-emerald-700 dark:text-emerald-300 max-w-md mx-auto">
          {locale === 'am'
            ? 'ለሰጡት ልግስና እናመሰግናለን። በአስተዳዳሪዎች ከተረጋገጠ በኋላ በይፋዊው ዝርዝር ውስጥ ይካተታል።'
            : 'Thank you for your generosity. Once verified by our administrators, it will appear in the public totals.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setSuccess(false);
            setAmountBirr('');
            setReferenceNo('');
            setFile(null);
          }}
          className="px-5 py-2.5 rounded-xl bg-[#1B4332] text-white text-xs font-semibold hover:bg-[#143325]"
        >
          {locale === 'am' ? 'ሌላ አስተዋጽኦ አስገባ' : 'Submit Another'}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-sm"
    >
      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-100 text-red-900 border border-red-300 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Contribution Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          {locale === 'am' ? 'የአስተዋጽኦ ዓይነት' : 'Contribution Type'}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setKind('partner')}
            className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition ${
              kind === 'partner'
                ? 'border-[#1B4332] bg-emerald-50 dark:bg-emerald-950/40 text-[#1B4332] dark:text-emerald-300'
                : 'border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-400'
            }`}
          >
            {locale === 'am' ? '🤝 አጋር (Partner)' : '🤝 Partner'}
          </button>
          <button
            type="button"
            onClick={() => setKind('sponsor')}
            className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition ${
              kind === 'sponsor'
                ? 'border-[#1B4332] bg-emerald-50 dark:bg-emerald-950/40 text-[#1B4332] dark:text-emerald-300'
                : 'border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-400'
            }`}
          >
            {locale === 'am' ? '🌟 ስፖንሰር (Sponsor)' : '🌟 Sponsor'}
          </button>
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          {locale === 'am' ? 'የክፍያ መንገድ' : 'Payment Method'}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMethod('telebirr')}
            className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition ${
              method === 'telebirr'
                ? 'border-[#1B4332] bg-emerald-50 dark:bg-emerald-950/40 text-[#1B4332] dark:text-emerald-300'
                : 'border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-400'
            }`}
          >
            📱 Telebirr
          </button>
          <button
            type="button"
            onClick={() => setMethod('bank')}
            className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition ${
              method === 'bank'
                ? 'border-[#1B4332] bg-emerald-50 dark:bg-emerald-950/40 text-[#1B4332] dark:text-emerald-300'
                : 'border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-400'
            }`}
          >
            🏦 Bank Transfer
          </button>
        </div>
      </div>

      {/* Display Active Accounts for Transfer */}
      {filteredAccounts.length > 0 && (
        <div className="p-4 rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700 space-y-2 text-xs">
          <p className="font-bold text-stone-700 dark:text-slate-300">
            {locale === 'am' ? 'ለክፍያ የሚጠቀሙባቸው አካውንቶች፦' : 'Transfer to any of these accounts:'}
          </p>
          {filteredAccounts.map((acc) => (
            <div key={acc.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 space-y-1">
              <div className="font-semibold text-[#1B4332] dark:text-emerald-400 text-sm">
                {acc.bank_name || acc.method.toUpperCase()}
              </div>
              <div className="font-mono text-sm">{acc.account_number}</div>
              <div className="text-stone-500">{acc.account_name}</div>
            </div>
          ))}
        </div>
      )}

      {/* Amount & Reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            {locale === 'am' ? 'የገንዘብ መጠን (ብር / ETB)' : 'Amount (ETB)'} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="1"
            required
            value={amountBirr}
            onChange={(e) => setAmountBirr(e.target.value)}
            placeholder="500"
            className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm tabular-nums"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            {locale === 'am' ? 'የግብይት ማጣቀሻ ቁጥር (Reference No)' : 'Reference / Transaction No'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder="TXN12345678"
            className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm font-mono"
          />
        </div>
      </div>

      {/* Screenshot Upload */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          {locale === 'am' ? 'የክፍያ ደረሰኝ ፎቶ (Screenshot)' : 'Transfer Receipt Screenshot'} <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept="image/*"
          required
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#1B4332] file:text-white hover:file:bg-[#143325]"
        />
      </div>

      {/* Optional Contact Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            {locale === 'am' ? 'ስምዎ (አማራጭ)' : 'Your Name (Optional)'}
          </label>
          <input
            type="text"
            value={contributorName}
            onChange={(e) => setContributorName(e.target.value)}
            className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            {locale === 'am' ? 'ስልክ ቁጥርዎ (አማራጭ)' : 'Phone Number (Optional)'}
          </label>
          <input
            type="tel"
            value={contributorPhone}
            onChange={(e) => setContributorPhone(e.target.value)}
            placeholder="09..."
            className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">
          {locale === 'am' ? 'ማስታወሻ (አማራጭ)' : 'Note (Optional)'}
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-stone-300 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-[#1B4332] hover:bg-[#143325] disabled:opacity-50 text-white font-semibold transition shadow-sm"
      >
        {loading
          ? locale === 'am'
            ? 'በመላክ ላይ...'
            : 'Submitting...'
          : locale === 'am'
          ? 'አስተዋጽኦ አስገባ'
          : 'Submit Contribution'}
      </button>
    </form>
  );
}