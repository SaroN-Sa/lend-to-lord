export type ContributionStatus = 'pending' | 'approved' | 'rejected';

export interface ContributionInput {
  donor_name: string;
  phone?: string;
  bank_name: string;
  amount_birr: string | number;
  reference_no: string;
  is_anonymous?: boolean;
  note?: string;
}

export interface ContributionRecord {
  id: string;
  donor_name: string;
  phone?: string | null;
  bank_name: string;
  amount_birr: number;
  reference_no: string;
  status: ContributionStatus;
  is_anonymous?: boolean;
  note?: string | null;
  receipt_path?: string | null;
  receipt_url?: string | null;
  created_at: string;
}

export interface ValidationErrors {
  donor_name?: string;
  phone?: string;
  amount_birr?: string;
  reference_no?: string;
  receipt?: string;
}

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateContribution(
  input: ContributionInput,
  file?: File | null
): ValidationErrors {
  const errors: ValidationErrors = {};
  const name = input.donor_name.trim();
  const amount = Number(input.amount_birr);
  const ref = input.reference_no.trim();
  const phone = (input.phone || '').trim();

  if (name.length < 2) {
    errors.donor_name = 'Enter a valid full name (at least 2 characters).';
  }
  if (phone && !/^(\+251|0)?[79]\d{8}$/.test(phone.replace(/[\s-]/g, ''))) {
    errors.phone = 'Enter a valid Ethiopian phone number (e.g., 0911223344).';
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount_birr = 'Contribution amount must be greater than 0 ETB.';
  }
  if (ref.length < 4 || !/^[A-Za-z0-9/_-]+$/.test(ref)) {
    errors.reference_no = 'Reference number must be at least 4 valid characters.';
  }
  if (file) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      errors.receipt = 'Only PNG, JPG, or WebP screenshots are accepted.';
    } else if (file.size > MAX_RECEIPT_BYTES) {
      errors.receipt = 'Receipt image must be smaller than 5 MB.';
    }
  }

  return errors;
}

export function formatBirr(amount: number): string {
  return `${new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(
    Number.isFinite(amount) ? amount : 0
  )} ETB`;
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function escapeCsvCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[]
): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(',');
  const body = rows.map((row) =>
    columns.map((c) => escapeCsvCell(row[c.key])).join(',')
  );
  return [header, ...body].join('\n');
}