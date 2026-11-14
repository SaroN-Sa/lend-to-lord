const ETHIOPIAN_MONTHS_AM: Record<number, string> = {
  1: 'መስከረም',
  2: 'ጥቅምት',
  3: 'ኅዳር',
  4: 'ታኅሣሥ',
  5: 'ጥር',
  6: 'የካቲት',
  7: 'መጋቢት',
  8: 'ሚያዝያ',
  9: 'ግንቦት',
  10: 'ሰኔ',
  11: 'ሐምሌ',
  12: 'ነሐሴ',
};

const ETHIOPIAN_MONTHS_EN: Record<number, string> = {
  1: 'Meskerem',
  2: 'Tikimt',
  3: 'Hidar',
  4: 'Tahsas',
  5: 'Tir',
  6: 'Yekatit',
  7: 'Megabit',
  8: 'Miazia',
  9: 'Ginbot',
  10: 'Sene',
  11: 'Hamle',
  12: 'Nehase',
};

/**
 * Returns the current Ethiopian year, month (1-12, with Pagume 13 rolled into 12),
 * and day (1-30) in Africa/Addis_Ababa timezone.
 */
export function getEthiopianDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  monthKey: string; // 'YYYY-MM', e.g., '2019-03'
} {
  const formatter = new Intl.DateTimeFormat('en-US-u-ca-ethiopic', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const rawYear = Number(parts.find((p) => p.type === 'year')?.value ?? 2019);
  const rawMonth = Number(parts.find((p) => p.type === 'month')?.value ?? 1);
  const rawDay = Number(parts.find((p) => p.type === 'day')?.value ?? 1);

  // Roll Pagume (month 13) into Nehase (month 12) for monthly accounting
  const month = rawMonth === 13 ? 12 : rawMonth;
  const monthKey = `${rawYear}-${String(month).padStart(2, '0')}`;

  return { year: rawYear, month, day: rawDay, monthKey };
}

/**
 * Returns the next Ethiopian month key ('YYYY-MM') for monthly reminder jobs.
 */
export function getNextEthiopianMonthKey(currentMonthKey: string): string {
  const [yearStr, monthStr] = currentMonthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (month >= 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Formats an ethiopian_month key ('2019-03') into Amharic ('ኅዳር 2019 ዓ.ም')
 * or English ('Hidar 2019 E.C.').
 */
export function formatEthiopianMonth(monthKey: string, locale: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const monthNum = Number(monthStr);

  if (locale === 'am') {
    const nameAm = ETHIOPIAN_MONTHS_AM[monthNum] || monthStr;
    return `${nameAm} ${yearStr} ዓ.ም`;
  }

  const nameEn = ETHIOPIAN_MONTHS_EN[monthNum] || monthStr;
  return `${nameEn} ${yearStr} E.C.`;
}

/**
 * Formats a Date or ISO timestamp into an Ethiopian date string for the public feed.
 */
export function formatEthiopianDay(dateInput: string | Date, locale: string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const { year, month, day } = getEthiopianDateParts(d);

  if (locale === 'am') {
    return `${ETHIOPIAN_MONTHS_AM[month]} ${day}, ${year} ዓ.ም`;
  }
  return `${ETHIOPIAN_MONTHS_EN[month]} ${day}, ${year} E.C.`;
}