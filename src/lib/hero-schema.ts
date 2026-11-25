import { z } from 'zod';

export const MAX_HERO_DIMENSION = 4000;

export const supabaseUrlSchema = z
  .string()
  .trim()
  .min(1, 'Supabase URL is required')
  .refine(
    (val) => {
      try {
        const parsed = new URL(val);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return false;
        }
        if (parsed.hostname === 'placeholder.supabase.co') {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid Supabase URL' }
  );

export const heroPathSchema = z
  .string()
  .min(1, 'Image path cannot be empty')
  .max(300, 'Image path is too long')
  .refine(
    (path) => {
      if (path.startsWith('/')) return false;
      if (path.includes('..') || path.includes('\\')) return false;
      if (path.toLowerCase().includes('%2e%2e')) return false;
      return path.startsWith('hero/') && path.length > 'hero/'.length;
    },
    { message: 'Image path must start with hero/ and must not contain traversal segments' }
  );

const positiveHeroDimensionSchema = z
  .number()
  .int('Dimension must be an integer')
  .min(1, 'Dimension must be positive')
  .max(MAX_HERO_DIMENSION, `Dimension must be <= ${MAX_HERO_DIMENSION}`);

export const heroRowSchema = z
  .object({
    image_path: z.string().nullable(),
    image_width: positiveHeroDimensionSchema.nullable(),
    image_height: positiveHeroDimensionSchema.nullable(),
    alt_en: z.string(),
    alt_am: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.image_path === null) {
      if (data.image_width !== null || data.image_height !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Dimensions must be null when image_path is null',
        });
      }
      return;
    }

    const pathCheck = heroPathSchema.safeParse(data.image_path);
    if (!pathCheck.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['image_path'],
        message: pathCheck.error.issues[0]?.message || 'Invalid image_path',
      });
    }

    if (data.image_width === null || data.image_height === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Both image_width and image_height are required when image_path is set',
      });
    }
  });

export type HeroRow = z.infer<typeof heroRowSchema>;

/**
 * Resolves localized alt text for the hero image.
 * On /am, uses trimmed alt_am when non-empty, otherwise falls back to trimmed alt_en.
 * Returns null if neither provides non-empty text.
 */
export function resolveHeroAltText(
  locale: string,
  altEn: string,
  altAm?: string | null
): string | null {
  if (locale === 'am' && typeof altAm === 'string') {
    const trimmedAm = altAm.trim();
    if (trimmedAm.length > 0) {
      return trimmedAm;
    }
  }

  const trimmedEn = altEn.trim();
  return trimmedEn.length > 0 ? trimmedEn : null;
}

/**
 * Builds the public Supabase Storage URL for a validated hero image path.
 * Performs zero network calls.
 */
export function buildHeroImageUrl(
  supabaseUrl: string | undefined,
  imagePath: string
): string | null {
  const urlResult = supabaseUrlSchema.safeParse(supabaseUrl);
  if (!urlResult.success) {
    return null;
  }

  const pathResult = heroPathSchema.safeParse(imagePath);
  if (!pathResult.success) {
    return null;
  }

  const parsedUrl = new URL(urlResult.data);
  return `${parsedUrl.origin}/storage/v1/object/public/site-media/${pathResult.data}`;
}
