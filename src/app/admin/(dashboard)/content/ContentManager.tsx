'use client';

import * as React from 'react';
import { shrinkImageInBrowser } from '@/lib/admin/canvas-shrink';
import { SponsorModal } from './SponsorModal';
import {
  updateHeroAction,
  removeHeroImageAction,
  createSponsorAction,
  updateSponsorAction,
  toggleSponsorActiveAction,
  reorderSponsorAction,
  deleteSponsorAction,
} from './actions';
import type { HeroRecord, SponsorRecord } from './page';

interface ContentManagerProps {
  initialHero: HeroRecord;
  initialSponsors: SponsorRecord[];
}

export function ContentManager({
  initialHero,
  initialSponsors,
}: ContentManagerProps) {
  // Hero State
  const [hero, setHero] = React.useState<HeroRecord>(initialHero);
  const [heroAltEn, setHeroAltEn] = React.useState(initialHero.alt_en);
  const [heroAltAm, setHeroAltAm] = React.useState(initialHero.alt_am || '');
  const [heroFile, setHeroFile] = React.useState<File | null>(null);
  const [heroPreviewUrl, setHeroPreviewUrl] = React.useState<string | null>(null);
  const [heroSaving, setHeroSaving] = React.useState(false);
  const [heroError, setHeroError] = React.useState<string | null>(null);
  const [heroSuccess, setHeroSuccess] = React.useState<string | null>(null);

  // Sponsors State
  const [sponsors, setSponsors] = React.useState<SponsorRecord[]>(initialSponsors);
  const [sponsorModalOpen, setSponsorModalOpen] = React.useState(false);
  const [editingSponsor, setEditingSponsor] = React.useState<SponsorRecord | null>(null);
  const [sponsorName, setSponsorName] = React.useState('');
  const [sponsorWebsite, setSponsorWebsite] = React.useState('');
  const [sponsorSortOrder, setSponsorSortOrder] = React.useState(0);
  const [sponsorIsActive, setSponsorIsActive] = React.useState(true);
  const [sponsorLogoFile, setSponsorLogoFile] = React.useState<File | null>(null);
  const [sponsorLogoPreview, setSponsorLogoPreview] = React.useState<string | null>(null);
  const [sponsorSaving, setSponsorSaving] = React.useState(false);
  const [sponsorError, setSponsorError] = React.useState<string | null>(null);
  const [sponsorSuccess, setSponsorSuccess] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  // Delete modal state
  const [deleteConfirmSponsor, setDeleteConfirmSponsor] = React.useState<SponsorRecord | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  // Handle local Hero file selection & preview
  async function handleHeroFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    setHeroError(null);
    try {
      setHeroPreviewUrl(URL.createObjectURL(f));
      const shrunk = await shrinkImageInBrowser(f, {
        maxWidth: 1600,
        mimeType: 'image/webp',
        quality: 0.88,
      });

      if (shrunk.size > 2 * 1024 * 1024) {
        setHeroError('Optimized image exceeds 2 MB limit. Please select a smaller image.');
        return;
      }
      setHeroFile(shrunk);
    } catch {
      setHeroFile(f);
    }
  }

  // Handle Hero Save
  async function handleHeroSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHeroError(null);
    setHeroSuccess(null);
    setHeroSaving(true);

    try {
      const fd = new FormData();
      fd.append('alt_en', heroAltEn);
      fd.append('alt_am', heroAltAm);
      if (heroFile) {
        fd.append('image', heroFile);
      }

      const res = await updateHeroAction(fd);
      if (!res.ok) {
        setHeroError(res.error);
      } else {
        setHeroSuccess(res.message || 'Hero settings saved successfully');
        setHeroFile(null);
        if (heroPreviewUrl) {
          URL.revokeObjectURL(heroPreviewUrl);
          setHeroPreviewUrl(null);
        }
      }
    } catch {
      setHeroError('An unexpected network error occurred while saving hero.');
    } finally {
      setHeroSaving(false);
    }
  }

  // Handle Remove Hero Image
  async function handleRemoveHeroImage() {
    if (!confirm('Are you sure you want to remove the current hero image?')) return;

    setHeroError(null);
    setHeroSuccess(null);
    setHeroSaving(true);

    try {
      const res = await removeHeroImageAction();
      if (!res.ok) {
        setHeroError(res.error);
      } else {
        setHero((prev) => ({
          ...prev,
          image_path: null,
          image_width: null,
          image_height: null,
          publicUrl: null,
        }));
        setHeroFile(null);
        if (heroPreviewUrl) {
          URL.revokeObjectURL(heroPreviewUrl);
          setHeroPreviewUrl(null);
        }
        setHeroSuccess('Hero image removed successfully');
      }
    } catch {
      setHeroError('An error occurred while removing the hero image.');
    } finally {
      setHeroSaving(false);
    }
  }

  // Open Sponsor Modal
  function openCreateSponsor() {
    setEditingSponsor(null);
    setSponsorName('');
    setSponsorWebsite('');
    setSponsorSortOrder(sponsors.length > 0 ? Math.max(...sponsors.map((s) => s.sort_order)) + 10 : 0);
    setSponsorIsActive(true);
    setSponsorLogoFile(null);
    setSponsorLogoPreview(null);
    setFieldErrors({});
    setSponsorError(null);
    setSponsorModalOpen(true);
  }

  function openEditSponsor(s: SponsorRecord) {
    setEditingSponsor(s);
    setSponsorName(s.name);
    setSponsorWebsite(s.website_url || '');
    setSponsorSortOrder(s.sort_order);
    setSponsorIsActive(s.is_active);
    setSponsorLogoFile(null);
    setSponsorLogoPreview(s.publicLogoUrl || null);
    setFieldErrors({});
    setSponsorError(null);
    setSponsorModalOpen(true);
  }

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      setSponsorLogoPreview(URL.createObjectURL(f));
      const shrunk = await shrinkImageInBrowser(f, {
        maxWidth: 400,
        mimeType: 'image/webp',
        quality: 0.9,
      });

      if (shrunk.size > 2 * 1024 * 1024) {
        setFieldErrors((prev) => ({ ...prev, logo: 'Logo file exceeds 2 MB limit' }));
        return;
      }
      setSponsorLogoFile(shrunk);
    } catch {
      setSponsorLogoFile(f);
    }
  }

  async function handleSponsorSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSponsorError(null);
    setSponsorSuccess(null);
    setFieldErrors({});
    setSponsorSaving(true);

    try {
      const fd = new FormData();
      fd.append('name', sponsorName);
      fd.append('website_url', sponsorWebsite);
      fd.append('sort_order', String(sponsorSortOrder));
      fd.append('is_active', sponsorIsActive ? 'true' : 'false');
      if (sponsorLogoFile) {
        fd.append('logo', sponsorLogoFile);
      }

      if (editingSponsor) {
        fd.append('id', editingSponsor.id);
        const res = await updateSponsorAction(fd);
        if (!res.ok) {
          setSponsorError(res.error);
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          setSponsorSuccess('Sponsor updated successfully');
          setSponsorModalOpen(false);
          setSponsors((prev) =>
            prev.map((item) =>
              item.id === editingSponsor.id
                ? {
                    ...item,
                    name: sponsorName,
                    website_url: sponsorWebsite || null,
                    sort_order: sponsorSortOrder,
                    is_active: sponsorIsActive,
                    publicLogoUrl: sponsorLogoPreview || item.publicLogoUrl,
                  }
                : item
            )
          );
        }
      } else {
        const res = await createSponsorAction(fd);
        if (!res.ok) {
          setSponsorError(res.error);
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        } else {
          setSponsorSuccess('Sponsor created successfully');
          setSponsorModalOpen(false);
          const newSponsor: SponsorRecord = {
            id: crypto.randomUUID(),
            name: sponsorName,
            logo_path: '',
            website_url: sponsorWebsite || null,
            sort_order: sponsorSortOrder,
            is_active: sponsorIsActive,
            publicLogoUrl: sponsorLogoPreview || undefined,
          };
          setSponsors((prev) => [...prev, newSponsor].sort((a, b) => a.sort_order - b.sort_order));
        }
      }
    } catch {
      setSponsorError('An error occurred while saving sponsor.');
    } finally {
      setSponsorSaving(false);
    }
  }

  async function handleToggleActive(s: SponsorRecord) {
    const nextActive = !s.is_active;
    const res = await toggleSponsorActiveAction(s.id, nextActive);
    if (res.ok) {
      setSponsors((prev) =>
        prev.map((item) => (item.id === s.id ? { ...item, is_active: nextActive } : item))
      );
    } else {
      setSponsorError(res.error);
    }
  }

  async function handleReorder(s: SponsorRecord, delta: number) {
    const newOrder = s.sort_order + delta;
    const res = await reorderSponsorAction(s.id, newOrder);
    if (res.ok) {
      setSponsors((prev) =>
        prev
          .map((item) => (item.id === s.id ? { ...item, sort_order: newOrder } : item))
          .sort((a, b) => a.sort_order - b.sort_order)
      );
    } else {
      setSponsorError(res.error);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmSponsor) return;
    setDeleteBusy(true);

    try {
      const res = await deleteSponsorAction(deleteConfirmSponsor.id);
      if (!res.ok) {
        setSponsorError(res.error);
      } else {
        setSponsors((prev) => prev.filter((item) => item.id !== deleteConfirmSponsor.id));
        setSponsorSuccess('Sponsor deleted successfully');
        setDeleteConfirmSponsor(null);
      }
    } catch {
      setSponsorError('Failed to delete sponsor.');
    } finally {
      setDeleteBusy(false);
    }
  }

  const currentDisplayUrl = heroPreviewUrl || hero.publicUrl;

  return (
    <div className="space-y-10">
      {/* ======================================================== */}
      {/* 1. HERO IMAGE SECTION                                    */}
      {/* ======================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Hero Image & Alt Text</h2>
            <p className="text-xs text-slate-500">
              Configure the banner image displayed at the top of the public home page.
            </p>
          </div>
          {hero.image_path && (
            <button
              type="button"
              onClick={handleRemoveHeroImage}
              disabled={heroSaving}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
            >
              Remove Image
            </button>
          )}
        </div>

        {heroError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
            {heroError}
          </div>
        )}
        {heroSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            {heroSuccess}
          </div>
        )}

        <form onSubmit={handleHeroSubmit} className="space-y-6">
          <div className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current Banner
            </span>
            <div className="relative aspect-[16/9] w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
              {currentDisplayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentDisplayUrl}
                  alt={heroAltEn || 'Hero preview'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-6 space-y-1">
                  <p className="text-sm font-semibold text-slate-400">No Hero Image Configured</p>
                  <p className="text-xs text-slate-400">Default fallback gradient is shown on the home page</p>
                </div>
              )}
            </div>
            {hero.image_width && hero.image_height && (
              <p className="text-xs text-slate-500">
                Dimensions: {hero.image_width} × {hero.image_height} px
              </p>
            )}
          </div>

          <div className="space-y-1.5 max-w-md">
            <label htmlFor="hero-image-file" className="block text-sm font-medium text-slate-700">
              {hero.image_path ? 'Replace Image' : 'Upload Image'}
            </label>
            <input
              id="hero-image-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleHeroFileChange}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            <p className="text-xs text-slate-400">
              Max 4000×4000 px, 2 MB. Auto-resized to ~1600px WebP before upload.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="hero-alt-en" className="block text-sm font-medium text-slate-700">
                English Alt Text {(hero.image_path || heroFile) && <span className="text-rose-600">*</span>}
              </label>
              <input
                id="hero-alt-en"
                type="text"
                required={Boolean(hero.image_path || heroFile)}
                maxLength={200}
                value={heroAltEn}
                onChange={(e) => setHeroAltEn(e.target.value)}
                placeholder="e.g. Congregation worship gathering in Addis Ababa"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <p className="text-xs text-slate-400">{heroAltEn.length}/200 characters</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="hero-alt-am" className="block text-sm font-medium text-slate-700">
                Amharic Alt Text <span className="text-slate-400 text-xs">(optional)</span>
              </label>
              <input
                id="hero-alt-am"
                type="text"
                maxLength={200}
                value={heroAltAm}
                onChange={(e) => setHeroAltAm(e.target.value)}
                placeholder="የአምልኮ ህብረት በአዲስ አበባ"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <p className="text-xs text-slate-400">{heroAltAm.length}/200 characters</p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={heroSaving}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {heroSaving ? 'Saving...' : 'Save Hero Settings'}
            </button>
          </div>
        </form>
      </section>

      {/* ======================================================== */}
      {/* 2. SPONSORS & PARTNERS SECTION                           */}
      {/* ======================================================== */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sponsors & Partner Organizations</h2>
            <p className="text-xs text-slate-500">
              Manage logos and external links displayed on the public home page.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateSponsor}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition"
          >
            + Add Sponsor
          </button>
        </div>

        {sponsorError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
            {sponsorError}
          </div>
        )}
        {sponsorSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            {sponsorSuccess}
          </div>
        )}

        {sponsors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
            No sponsors registered yet. Click &ldquo;+ Add Sponsor&rdquo; to add your first partner.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
            {sponsors.map((s) => (
              <div
                key={s.id}
                className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/50 transition"
              >
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-50 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    {s.publicLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.publicLogoUrl}
                        alt={`${s.name} logo`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">No logo</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{s.name}</h3>
                    {s.website_url ? (
                      <a
                        href={s.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        {s.website_url}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">No website</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(s)}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                      s.is_active
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s.is_active ? 'Active' : 'Inactive'}
                  </button>

                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 font-mono">#{s.sort_order}</span>
                    <button
                      type="button"
                      aria-label={`Increase order for ${s.name}`}
                      onClick={() => handleReorder(s, -1)}
                      className="p-1 rounded border border-slate-200 bg-white text-xs hover:bg-slate-100 text-slate-600"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label={`Decrease order for ${s.name}`}
                      onClick={() => handleReorder(s, 1)}
                      className="p-1 rounded border border-slate-200 bg-white text-xs hover:bg-slate-100 text-slate-600"
                    >
                      ▼
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditSponsor(s)}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmSponsor(s)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* 3. ADD / EDIT SPONSOR MODAL                              */}
      {/* ======================================================== */}
      <SponsorModal
        isOpen={sponsorModalOpen}
        onClose={() => setSponsorModalOpen(false)}
        editingSponsor={editingSponsor}
        onSubmit={handleSponsorSubmit}
        name={sponsorName}
        setName={setSponsorName}
        website={sponsorWebsite}
        setWebsite={setSponsorWebsite}
        sortOrder={sponsorSortOrder}
        setSortOrder={setSponsorSortOrder}
        isActive={sponsorIsActive}
        setIsActive={setSponsorIsActive}
        onLogoChange={handleLogoFileChange}
        logoPreview={sponsorLogoPreview}
        saving={sponsorSaving}
        fieldErrors={fieldErrors}
      />

      {/* ======================================================== */}
      {/* 4. DELETE CONFIRMATION MODAL                             */}
      {/* ======================================================== */}
      {deleteConfirmSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong>{deleteConfirmSponsor.name}</strong>?
              This will remove the sponsor from public view and delete its logo from storage.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteConfirmSponsor(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteBusy ? 'Deleting...' : 'Delete Sponsor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
