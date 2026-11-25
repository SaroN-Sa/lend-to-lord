'use client';

import * as React from 'react';
import type { SponsorRecord } from './page';

interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSponsor: SponsorRecord | null;
  onSubmit: (e: React.FormEvent) => void;
  name: string;
  setName: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  sortOrder: number;
  setSortOrder: (v: number) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  logoPreview: string | null;
  saving: boolean;
  fieldErrors: Record<string, string>;
}

export function SponsorModal({
  isOpen,
  onClose,
  editingSponsor,
  onSubmit,
  name,
  setName,
  website,
  setWebsite,
  sortOrder,
  setSortOrder,
  isActive,
  setIsActive,
  onLogoChange,
  logoPreview,
  saving,
  fieldErrors,
}: SponsorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900">
            {editingSponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <label htmlFor="sponsor-name" className="block text-xs font-semibold text-slate-700">
              Sponsor Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="sponsor-name"
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-600">{fieldErrors.name}</p>
            )}
          </div>

          {/* Website URL */}
          <div className="space-y-1">
            <label htmlFor="sponsor-website" className="block text-xs font-semibold text-slate-700">
              Website URL <span className="text-slate-400 text-xs">(optional, https://)</span>
            </label>
            <input
              id="sponsor-website"
              type="url"
              maxLength={500}
              placeholder="https://example.org"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            {fieldErrors.website_url && (
              <p className="text-xs text-rose-600">{fieldErrors.website_url}</p>
            )}
          </div>

          {/* Sort Order & Active */}
          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="space-y-1">
              <label htmlFor="sponsor-sort" className="block text-xs font-semibold text-slate-700">
                Sort Order
              </label>
              <input
                id="sponsor-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                Active Listing
              </label>
            </div>
          </div>

          {/* Logo Upload & Preview */}
          <div className="space-y-2">
            <label htmlFor="sponsor-logo-file" className="block text-xs font-semibold text-slate-700">
              Logo Image {editingSponsor ? <span className="text-slate-400 text-xs">(optional replacement)</span> : <span className="text-rose-600">*</span>}
            </label>
            <input
              id="sponsor-logo-file"
              type="file"
              required={!editingSponsor}
              accept="image/jpeg,image/png,image/webp"
              onChange={onLogoChange}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            {logoPreview && (
              <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 p-1 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            {fieldErrors.logo && (
              <p className="text-xs text-rose-600">{fieldErrors.logo}</p>
            )}
          </div>

          {/* Submit / Cancel */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingSponsor ? 'Update Sponsor' : 'Create Sponsor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
