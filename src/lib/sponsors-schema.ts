import { z } from 'zod';
import { supabaseUrlSchema } from '@/lib/hero-schema';

export const MAX_SPONSORS = 24;

export const sponsorLogoPathSchema = z
  .string()
  .min(1, 'Logo path cannot be empty')
  .max(300, 'Logo path is too long')
  .refine(
    (path) => {
      if (path.startsWith('/')) return false;
      if (path.includes('..') || path.includes('\\')) return false;
      if (path.toLowerCase().includes('%2e%2e')) return false;
      return path.startsWith('sponsors/') && path.length > 'sponsors/'.length;
    },
    { message: 'Logo path must start with sponsors/ and must not contain traversal segments' }
  );

export const sponsorWebsiteUrlSchema = z
  .string()
  .trim()
  .max(500, 'Website URL must be 500 characters or fewer')
  .refine(
    (val) => {
      if (val.length === 0 || val.startsWith('//')) return false;
      try {
        const parsed = new URL(val);
        if (parsed.protocol !== 'https:') return false;
        if (parsed.username !== '' || parsed.password !== '') return false;
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Website URL must be a valid https:// URL without embedded credentials' }
  )
  .nullable();

export const sponsorRowSchema = z.object({
  id: z.string().uuid('Sponsor id must be a valid UUID'),
  name: z
    .string()
    .trim()
    .min(1, 'Sponsor name must not be empty')
    .max(120, 'Sponsor name must be 120 characters or fewer'),
  logo_path: sponsorLogoPathSchema,
  website_url: sponsorWebsiteUrlSchema,
  sort_order: z.number().int('sort_order must be a finite integer'),
});

export type ValidSponsorRow = z.infer<typeof sponsorRowSchema>;

/**
 * Builds the public Supabase Storage URL for a validated sponsor logo path.
 * Reuses Task 8's supabaseUrlSchema env guard and performs zero network calls.
 */
export function buildSponsorLogoUrl(
  supabaseUrl: string | undefined,
  logoPath: string
): string | null {
  const urlResult = supabaseUrlSchema.safeParse(supabaseUrl);
  if (!urlResult.success) {
    return null;
  }

  const pathResult = sponsorLogoPathSchema.safeParse(logoPath);
  if (!pathResult.success) {
    return null;
  }

  const parsedUrl = new URL(urlResult.data);
  return `${parsedUrl.origin}/storage/v1/object/public/site-media/${pathResult.data}`;
}
