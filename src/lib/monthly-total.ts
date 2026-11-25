import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { getEthiopianDateParts } from '@/lib/ethiopian-calendar';

export type MonthlyTotalState =
  | { status: 'loaded'; amount: number; formattedAmount: string }
  | { status: 'empty' }
  | { status: 'error'; messageKey: string };

const validNumericStringRegex = /^\d+(\.\d+)?$/;

export const rawMonthlyTotalSchema = z
  .unknown()
  .superRefine((val, ctx) => {
    if (val === null || val === undefined) return;
    if (typeof val === 'number') {
      if (!Number.isFinite(val) || val < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid number' });
      }
      return;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!validNumericStringRegex.test(trimmed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid numeric string' });
      }
      return;
    }
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Expected number, string, or null' });
  })
  .transform((val): number | null => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return Number(val.trim());
    return null;
  });

export function formatMonthlyTotal(amount: number): string {
  const safeAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export function parseMonthlyTotalRow(row: unknown): MonthlyTotalState {
  if (row === null || row === undefined) {
    return { status: 'empty' };
  }

  if (typeof row !== 'object' || Array.isArray(row)) {
    console.error('[home:monthly-total] Invalid row structure:', row);
    return { status: 'error', messageKey: 'error' };
  }

  const rawValue = (row as Record<string, unknown>).total_birr;
  const parsed = rawMonthlyTotalSchema.safeParse(rawValue);

  if (!parsed.success) {
    console.error('[home:monthly-total] Schema validation failed:', parsed.error);
    return { status: 'error', messageKey: 'error' };
  }

  const amount = parsed.data;
  if (amount === null || amount === 0) {
    return { status: 'empty' };
  }

  return {
    status: 'loaded',
    amount,
    formattedAmount: formatMonthlyTotal(amount),
  };
}

function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key';

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        return fetch(input, {
          ...init,
          next: { revalidate: 60, tags: ['monthly-total'] },
        });
      },
    },
  });
}

async function fetchFromDb(monthKey: string) {
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from('public_monthly_totals')
    .select('total_birr')
    .eq('ethiopian_month', monthKey)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

const getCachedMonthlyRow = unstable_cache(
  async (monthKey: string) => {
    return await fetchFromDb(monthKey);
  },
  ['public_monthly_totals_cache'],
  { revalidate: 60, tags: ['monthly-total'] }
);

export async function getMonthlyTotal(monthKeyOverride?: string): Promise<MonthlyTotalState> {
  const monthKey = monthKeyOverride || getEthiopianDateParts().monthKey;
  try {
    const row = await getCachedMonthlyRow(monthKey);
    return parseMonthlyTotalRow(row);
  } catch (error) {
    console.error('[home:monthly-total] Error fetching monthly total:', error);
    return { status: 'error', messageKey: 'error' };
  }
}
