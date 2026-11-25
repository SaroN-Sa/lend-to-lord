import { z } from 'zod';

export const storagePathSchema = z
  .string()
  .min(1)
  .max(300)
  .refine(
    (path) => {
      if (path.includes('..')) return false;
      return path.startsWith('hero/') || path.startsWith('sponsors/');
    },
    { message: 'Path must start with hero/ or sponsors/ and cannot contain ..' }
  );

export const heroInputSchema = z
  .object({
    alt_en: z.string().trim().max(200, 'English alt text must be 200 characters or fewer'),
    alt_am: z
      .string()
      .trim()
      .max(200, 'Amharic alt text must be 200 characters or fewer')
      .optional()
      .or(z.literal('')),
    hasImage: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.hasImage && data.alt_en.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['alt_en'],
        message: 'English alt text is required when a hero image is set',
      });
    }
  });

export const websiteUrlSchema = z
  .string()
  .trim()
  .max(500, 'Website URL must be 500 characters or fewer')
  .optional()
  .or(z.literal(''))
  .refine(
    (val) => {
      if (!val || val.length === 0) return true;
      if (val.startsWith('//')) return false;
      try {
        const parsed = new URL(val);
        if (parsed.protocol !== 'https:') return false;
        if (parsed.username || parsed.password) return false;
        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        'Website URL must be a valid https:// URL without credentials or protocol-relative syntax',
    }
  );

export const sponsorInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Sponsor name is required')
    .max(120, 'Sponsor name must be 120 characters or fewer'),
  website_url: websiteUrlSchema,
  sort_order: z
    .number()
    .int('Sort order must be an integer')
    .min(-1000, 'Sort order must be at least -1000')
    .max(10000, 'Sort order must be at most 10000'),
  is_active: z.boolean().default(true),
});

export const sponsorIdSchema = z.string().uuid('Invalid sponsor ID format (must be UUID)');
