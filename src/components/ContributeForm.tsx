'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import {
  BANK_ACCOUNTS,
  QUICK_AMOUNTS,
  UI_COPY,
  type AppLocale,
} from '@/lib/constants';
import {
  formatBirr,
  validateContribution,
  type ContributionInput,
  type ValidationErrors,
} from '@/lib/validation';
import { AlertBanner, CopyBankCard } from './UiPrimitives';

const INITIAL_FORM: ContributionInput = {
  donor_name: '',
  phone: '',
  bank_name: 'CBE',
  amount_birr: '',
  reference_no: '',
  is_anonymous: false,
  note: '',
};

export function ContributeForm() {
  const locale = (useLocale() === 'en' ? 'en' : 'am') as AppLocale;
  const t = UI_COPY[locale].form;

  const [form, setForm] = useState<ContributionInput>(INITIAL_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const [submittedRef, setSubmittedRef] = useState('');

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors = validateContribution(form, file);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus('error');
      setFeedback('Please fix the highlighted errors before submitting.');
      return;
    }

    setStatus('submitting');
    setFeedback('');

    try {
      const payload = new FormData();
      payload.append('donor_name', form.donor_name.trim());
      payload.append('phone', (form.phone || '').trim());
      payload.append('bank_name', form.bank_name);
      payload.append('amount_birr', String(Number(form.amount_birr)));
      payload.append('reference_no', form.reference_no.trim());
      payload.append('is_anonymous', String(Boolean(form.is_anonymous)));
      payload.append('note', (form.note || '').trim());
      if (file) payload.append('receipt', file);

      const res = await fetch('/api/contributions', { method: 'POST', body: payload });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save contribution.');

      setSubmittedRef(form.reference_no.trim());
      setStatus('success');
      setForm(INITIAL_FORM);
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } catch (err) {
      setStatus('error');
      setFeedback(err instanceof Error ? err.message : 'Unexpected submission error.');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{t.successTitle}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Reference <span className="font-mono font-bold text-slate-900">{submittedRef}</span> has been
          queued for administrator verification.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          {t.another}
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      <aside className="space-y-3 lg:col-span-2">
        <h2 className="text-base font-bold text-slate-900">{t.bank}</h2>
        <div className="grid grid-cols-1 gap-3">
          {BANK_ACCOUNTS.map((bank) => (
            <CopyBankCard
              key={bank.id}
              bank={bank}
              selected={form.bank_name === bank.id}
              onSelect={(id) => setForm((prev) => ({ ...prev, bank_name: id }))}
            />
          ))}
        </div>
      </aside>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3 sm:p-8"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{t.subtitle}</p>
        </div>

        {status === 'error' && feedback && <AlertBanner variant="error">{feedback}</AlertBanner>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="donor_name" className="block text-sm font-semibold text-slate-700">
              {t.donorName} *
            </label>
            <input
              id="donor_name"
              name="donor_name"
              type="text"
              required
              minLength={2}
              value={form.donor_name}
              onChange={(e) => setForm({ ...form, donor_name: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            {errors.donor_name && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.donor_name}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
              {t.phone}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="0911223344"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            {errors.phone && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="amount_birr" className="block text-sm font-semibold text-slate-700">
            {t.amount} *
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setForm({ ...form, amount_birr: String(amt) })}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                  Number(form.amount_birr) === amt
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-400'
                }`}
              >
                {formatBirr(amt)}
              </button>
            ))}
          </div>
          <input
            id="amount_birr"
            name="amount_birr"
            type="number"
            required
            min={1}
            step="any"
            value={form.amount_birr}
            onChange={(e) => setForm({ ...form, amount_birr: e.target.value })}
            className="mt-2.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
          />
          {errors.amount_birr && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.amount_birr}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="bank_name" className="block text-sm font-semibold text-slate-700">
              {t.bank}
            </label>
            <select
              id="bank_name"
              name="bank_name"
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            >
              {BANK_ACCOUNTS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reference_no" className="block text-sm font-semibold text-slate-700">
              {t.reference} *
            </label>
            <input
              id="reference_no"
              name="reference_no"
              type="text"
              required
              minLength={4}
              placeholder="FT26321ABC99"
              value={form.reference_no}
              onChange={(e) => setForm({ ...form, reference_no: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm focus:border-emerald-600 focus:outline-none"
            />
            {errors.reference_no && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.reference_no}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="receipt" className="block text-sm font-semibold text-slate-700">
            {t.receipt}
          </label>
          <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-emerald-500 hover:bg-emerald-50/30">
            <input
              id="receipt"
              name="receipt"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="max-h-40 rounded-lg border border-slate-200 object-contain"
              />
            ) : (
              <span className="text-xs font-medium text-slate-600">{t.receiptHint}</span>
            )}
          </label>
          {errors.receipt && <p role="alert" className="mt-1 text-xs text-rose-600">{errors.receipt}</p>}
        </div>

        <div>
          <label htmlFor="note" className="block text-sm font-semibold text-slate-700">
            {t.note}
          </label>
          <textarea
            id="note"
            name="note"
            rows={2}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(form.is_anonymous)}
            onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-emerald-700"
          />
          <span>{t.anonymous}</span>
        </label>

        <button
          type="submit"
          disabled={status === 'submitting'}
          data-testid="contribute-submit"
          className="w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {status === 'submitting' ? t.submitting : t.submit}
        </button>
      </form>
    </div>
  );
}