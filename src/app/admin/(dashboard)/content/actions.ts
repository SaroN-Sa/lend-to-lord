'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  heroInputSchema,
  sponsorInputSchema,
  sponsorIdSchema,
  storagePathSchema,
} from '@/lib/admin/content-schema';
import {
  validateImageBuffer,
  HERO_LIMITS,
  LOGO_LIMITS,
} from '@/lib/admin/image-validator';

export type ActionResult<T = unknown> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Verifies that the current user is authenticated and has active admin status
 * via supabase.auth.getUser() and the public.is_admin() RPC.
 * Never uses getSession() or service-role keys.
 */
async function authenticateAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { supabase, user: null, isAdmin: false };
  }

  // Check admin status via the database function
  const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_admin');
  if (rpcErr || !isAdmin) {
    return { supabase, user, isAdmin: false };
  }

  return { supabase, user, isAdmin: true };
}

function revalidateAll() {
  try {
    revalidatePath('/en');
    revalidatePath('/am');
    revalidatePath('/admin/content');
  } catch (err) {
    console.error('[admin-content:revalidate]', err);
  }
}

/**
 * Safely removes a file from site-media after checking the path prefix and lack of '..'
 */
async function safeRemoveMedia(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  path: string
): Promise<boolean> {
  const parsedPath = storagePathSchema.safeParse(path);
  if (!parsedPath.success) {
    console.error('[admin-content:cleanup-invalid-path]', path);
    return false;
  }

  try {
    const { error } = await supabase.storage.from('site-media').remove([path]);
    if (error) {
      console.error('[admin-content:remove-file-failed]', { path, error: error.message });
      return false;
    }
    return true;
  } catch (err) {
    console.error('[admin-content:remove-file-exception]', { path, error: err });
    return false;
  }
}

// -------------------------------------------------------------
// HERO ACTIONS
// -------------------------------------------------------------

export async function updateHeroAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await authenticateAdmin();
  if (!isAdmin || !user) {
    return { ok: false, error: 'Unauthorized: Admin privileges required' };
  }

  const rawAltEn = String(formData.get('alt_en') || '');
  const rawAltAm = String(formData.get('alt_am') || '');
  const file = formData.get('image') as File | null;
  const hasFile = file instanceof File && file.size > 0;

  // Validate fields with Zod
  const zodResult = heroInputSchema.safeParse({
    alt_en: rawAltEn,
    alt_am: rawAltAm,
    hasImage: hasFile,
  });

  if (!zodResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of zodResult.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string') fieldErrors[field] = issue.message;
    }
    return { ok: false, error: 'Please correct the validation errors', fieldErrors };
  }

  const { alt_en, alt_am } = zodResult.data;

  // Fetch current row 1 to read previous image_path
  const { data: currentHero, error: fetchErr } = await supabase
    .from('home_hero')
    .select('image_path')
    .eq('id', 1)
    .maybeSingle();

  if (fetchErr) {
    console.error('[admin-content:fetch-hero]', fetchErr);
    return { ok: false, error: 'Unable to read current hero record' };
  }

  const oldImagePath = currentHero?.image_path || null;

  if (hasFile && file) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const validation = validateImageBuffer(buffer, HERO_LIMITS);

    if (!validation.ok) {
      return { ok: false, error: `Invalid image: ${validation.reason}` };
    }

    const uuid = crypto.randomUUID();
    const newPath = `hero/${uuid}.${validation.extension}`;

    // Upload to site-media with upsert: false
    const { error: uploadErr } = await supabase.storage
      .from('site-media')
      .upload(newPath, buffer, {
        contentType: validation.mimeType,
        upsert: false,
      });

    if (uploadErr) {
      console.error('[admin-content:upload-hero]', uploadErr);
      return { ok: false, error: 'Failed to upload hero image to storage' };
    }

    // Atomic DB update
    const { data: updatedRows, error: updateErr } = await supabase
      .from('home_hero')
      .update({
        image_path: newPath,
        image_width: validation.width,
        image_height: validation.height,
        alt_en,
        alt_am: alt_am || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select();

    if (updateErr || !updatedRows || updatedRows.length === 0) {
      console.error('[admin-content:update-hero]', updateErr);
      // Rollback: delete newly uploaded file, keep old
      await safeRemoveMedia(supabase, newPath);
      return { ok: false, error: 'Database update failed; newly uploaded file was rolled back' };
    }

    // Success: remove old file if present
    if (oldImagePath && oldImagePath !== newPath) {
      await safeRemoveMedia(supabase, oldImagePath);
    }
  } else {
    // Only update alt text
    const { data: updatedRows, error: updateErr } = await supabase
      .from('home_hero')
      .update({
        alt_en,
        alt_am: alt_am || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)
      .select();

    if (updateErr || !updatedRows || updatedRows.length === 0) {
      console.error('[admin-content:update-hero-text]', updateErr);
      return { ok: false, error: 'Failed to update hero text in database' };
    }
  }

  revalidateAll();
  return { ok: true, message: 'Hero settings saved successfully' };
}

export async function removeHeroImageAction(): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await authenticateAdmin();
  if (!isAdmin || !user) {
    return { ok: false, error: 'Unauthorized: Admin privileges required' };
  }

  // Fetch current row 1 to read previous image_path
  const { data: currentHero, error: fetchErr } = await supabase
    .from('home_hero')
    .select('image_path')
    .eq('id', 1)
    .maybeSingle();

  if (fetchErr) {
    console.error('[admin-content:fetch-hero-remove]', fetchErr);
    return { ok: false, error: 'Unable to read current hero record' };
  }

  const oldImagePath = currentHero?.image_path || null;

  // Clear image columns
  const { data: updatedRows, error: updateErr } = await supabase
    .from('home_hero')
    .update({
      image_path: null,
      image_width: null,
      image_height: null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select();

  if (updateErr || !updatedRows || updatedRows.length === 0) {
    console.error('[admin-content:remove-hero-db]', updateErr);
    return { ok: false, error: 'Failed to clear hero image in database' };
  }

  if (oldImagePath) {
    await safeRemoveMedia(supabase, oldImagePath);
  }

  revalidateAll();
  return { ok: true, message: 'Hero image removed successfully' };
}

// -------------------------------------------------------------
// SPONSOR ACTIONS
// -------------------------------------------------------------

export async function createSponsorAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await authenticateAdmin();
  if (!isAdmin || !user) {
    return { ok: false, error: 'Unauthorized: Admin privileges required' };
  }

  const rawName = String(formData.get('name') || '');
  const rawWebsite = String(formData.get('website_url') || '');
  const rawSortOrder = Number(formData.get('sort_order') || 0);
  const rawIsActive = formData.get('is_active') === 'true';
  const file = formData.get('logo') as File | null;

  // Validate fields with Zod
  const zodResult = sponsorInputSchema.safeParse({
    name: rawName,
    website_url: rawWebsite,
    sort_order: rawSortOrder,
    is_active: rawIsActive,
  });

  if (!zodResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of zodResult.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string') fieldErrors[field] = issue.message;
    }
    return { ok: false, error: 'Please correct the validation errors', fieldErrors };
  }

  if (!file || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Sponsor logo is required' };
  }

  // Validate binary
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const validation = validateImageBuffer(buffer, LOGO_LIMITS);

  if (!validation.ok) {
    return { ok: false, error: `Invalid logo: ${validation.reason}` };
  }

  const { name, website_url, sort_order, is_active } = zodResult.data;
  const uuid = crypto.randomUUID();
  const newPath = `sponsors/${uuid}.${validation.extension}`;

  // Upload to site-media
  const { error: uploadErr } = await supabase.storage
    .from('site-media')
    .upload(newPath, buffer, {
      contentType: validation.mimeType,
      upsert: false,
    });

  if (uploadErr) {
    console.error('[admin-content:upload-sponsor]', uploadErr);
    return { ok: false, error: 'Failed to upload sponsor logo to storage' };
  }

  // Insert row
  const { data: inserted, error: insertErr } = await supabase
    .from('sponsors')
    .insert({
      name,
      website_url: website_url || null,
      sort_order,
      is_active,
      logo_path: newPath,
      updated_by: user.id,
    })
    .select();

  if (insertErr || !inserted || inserted.length === 0) {
    console.error('[admin-content:insert-sponsor]', insertErr);
    await safeRemoveMedia(supabase, newPath);
    return { ok: false, error: 'Database insert failed; logo was rolled back' };
  }

  revalidateAll();
  return { ok: true, message: 'Sponsor created successfully' };
}

export async function updateSponsorAction(formData: FormData): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await authenticateAdmin();
  if (!isAdmin || !user) {
    return { ok: false, error: 'Unauthorized: Admin privileges required' };
  }

  const rawId = String(formData.get('id') || '');
  const idResult = sponsorIdSchema.safeParse(rawId);
  if (!idResult.success) {
    return { ok: false, error: 'Invalid sponsor ID format' };
  }

  const rawName = String(formData.get('name') || '');
  const rawWebsite = String(formData.get('website_url') || '');
  const rawSortOrder = Number(formData.get('sort_order') || 0);
  const rawIsActive = formData.get('is_active') === 'true';
  const file = formData.get('logo') as File | null;
  const hasFile = file instanceof File && file.size > 0;

  // Validate fields with Zod
  const zodResult = sponsorInputSchema.safeParse({
    name: rawName,
    website_url: rawWebsite,
    sort_order: rawSortOrder,
    is_active: rawIsActive,
  });

  if (!zodResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of zodResult.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string') fieldErrors[field] = issue.message;
    }
    return { ok: false, error: 'Please correct the validation errors', fieldErrors };
  }

  const sponsorId = idResult.data;
  const { name, website_url, sort_order, is_active } = zodResult.data;

  // Fetch current sponsor to get old logo
  const { data: currentSponsor, error: fetchErr } = await supabase
    .from('sponsors')
    .select('logo_path')
    .eq('id', sponsorId)
    .maybeSingle();

  if (fetchErr || !currentSponsor) {
    console.error('[admin-content:fetch-sponsor-update]', fetchErr);
    return { ok: false, error: 'Sponsor not found' };
  }

  const oldLogoPath = currentSponsor.logo_path;

  if (hasFile && file) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const validation = validateImageBuffer(buffer, LOGO_LIMITS);

    if (!validation.ok) {
      return { ok: false, error: `Invalid logo: ${validation.reason}` };
    }

    const uuid = crypto.randomUUID();
    const newPath = `sponsors/${uuid}.${validation.extension}`;

    const { error: uploadErr } = await supabase.storage
      .from('site-media')
      .upload(newPath, buffer, {
        contentType: validation.mimeType,
        upsert: false,
      });

    if (uploadErr) {
      console.error('[admin-content:upload-sponsor-logo-update]', uploadErr);
      return { ok: false, error: 'Failed to upload replacement logo' };
    }

    // Atomic update
    const { data: updated, error: updateErr } = await supabase
      .from('sponsors')
      .update({
        name,
        website_url: website_url || null,
        sort_order,
        is_active,
        logo_path: newPath,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sponsorId)
      .select();

    if (updateErr || !updated || updated.length === 0) {
      console.error('[admin-content:update-sponsor-db]', updateErr);
      await safeRemoveMedia(supabase, newPath);
      return { ok: false, error: 'Database update failed; replacement logo rolled back' };
    }

    // Delete old logo
    if (oldLogoPath && oldLogoPath !== newPath) {
      await safeRemoveMedia(supabase, oldLogoPath);
    }
  } else {
    // Only update fields
    const { data: updated, error: updateErr } = await supabase
      .from('sponsors')
      .update({
        name,
        website_url: website_url || null,
        sort_order,
        is_active,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sponsorId)
      .select();

    if (updateErr || !updated || updated.length === 0) {
      console.error('[admin-content:update-sponsor-text-db]', updateErr);
      return { ok: false, error: 'Database update failed' };
    }
  }

  revalidateAll();
  return { ok: true, message: 'Sponsor updated successfully' };
}

export async function toggleSponsorActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await authenticateAdmin();
  if (!isAdmin || !user) {
    return { ok: false, error: 'Unauthorized: Admin privileges required' };
  }

  const idResult = sponsorIdSchema.safeParse(id);
  if (!idResult.success) {
    return { ok: false, error: 'Invalid sponsor ID format' };
  }

  const { data: updated, error } = await supabase
    .from('sponsors')
    .update({
      is_active: isActive,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', idResult.data)
    .select();

  if (error || !updated || updated.length === 0) {
    console.error('[admin-content:toggle-active]', error);
    return { ok: false, error: 'Failed to update sponsor active state' };
  }

  revalidateAll();
  return { ok: true, message: `Sponsor ${isActive ? 'activated' : 'deactivated'}` };
}

export async function reorderSponsorAction(
  id: string,
  sortOrder: number
): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await authenticateAdmin();
  if (!isAdmin || !user) {
    return { ok: false, error: 'Unauthorized: Admin privileges required' };
  }

  const idResult = sponsorIdSchema.safeParse(id);
  if (!idResult.success) {
    return { ok: false, error: 'Invalid sponsor ID format' };
  }

  if (!Number.isInteger(sortOrder) || sortOrder < -1000 || sortOrder > 10000) {
    return { ok: false, error: 'Sort order must be an integer between -1000 and 10000' };
  }

  const { data: updated, error } = await supabase
    .from('sponsors')
    .update({
      sort_order: sortOrder,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', idResult.data)
    .select();

  if (error || !updated || updated.length === 0) {
    console.error('[admin-content:reorder-sponsor]', error);
    return { ok: false, error: 'Failed to update sort order' };
  }

  revalidateAll();
  return { ok: true, message: 'Sort order updated' };
}

export async function deleteSponsorAction(id: string): Promise<ActionResult> {
  const { supabase, user, isAdmin } = await authenticateAdmin();
  if (!isAdmin || !user) {
    return { ok: false, error: 'Unauthorized: Admin privileges required' };
  }

  const idResult = sponsorIdSchema.safeParse(id);
  if (!idResult.success) {
    return { ok: false, error: 'Invalid sponsor ID format' };
  }

  const sponsorId = idResult.data;

  // Read current logo path
  const { data: currentSponsor, error: fetchErr } = await supabase
    .from('sponsors')
    .select('logo_path')
    .eq('id', sponsorId)
    .maybeSingle();

  if (fetchErr || !currentSponsor) {
    console.error('[admin-content:fetch-sponsor-delete]', fetchErr);
    return { ok: false, error: 'Sponsor not found' };
  }

  const logoPath = currentSponsor.logo_path;

  // Delete database row first
  const { data: deletedRows, error: deleteErr } = await supabase
    .from('sponsors')
    .delete()
    .eq('id', sponsorId)
    .select();

  if (deleteErr || !deletedRows || deletedRows.length === 0) {
    console.error('[admin-content:delete-sponsor-db]', deleteErr);
    return { ok: false, error: 'Failed to delete sponsor from database' };
  }

  // Delete logo file from site-media
  if (logoPath) {
    const fileDeleted = await safeRemoveMedia(supabase, logoPath);
    if (!fileDeleted) {
      console.error('[admin-content:orphan-logo]', {
        sponsorId,
        path: logoPath,
        reason: 'Row deleted but storage removal failed',
      });
    }
  }

  revalidateAll();
  return { ok: true, message: 'Sponsor deleted successfully' };
}
