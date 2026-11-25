import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseMonthlyTotalRow,
  formatMonthlyTotal,
} from '@/lib/monthly-total';

describe('Task 5: Monthly Total Zod Validation & Parsing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Valid inputs -> status: "loaded"', () => {
    it('parses a valid number (12500)', () => {
      const result = parseMonthlyTotalRow({ total_birr: 12500 });
      expect(result.status).toBe('loaded');
      if (result.status === 'loaded') {
        expect(result.amount).toBe(12500);
        expect(result.formattedAmount).toBe('12,500');
      }
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('parses a valid integer string ("12500")', () => {
      const result = parseMonthlyTotalRow({ total_birr: '12500' });
      expect(result.status).toBe('loaded');
      if (result.status === 'loaded') {
        expect(result.amount).toBe(12500);
        expect(result.formattedAmount).toBe('12,500');
      }
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('parses a valid decimal string ("12500.00")', () => {
      const result = parseMonthlyTotalRow({ total_birr: '12500.00' });
      expect(result.status).toBe('loaded');
      if (result.status === 'loaded') {
        expect(result.amount).toBe(12500);
        expect(result.formattedAmount).toBe('12,500');
      }
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('parses a valid float ("12500.75")', () => {
      const result = parseMonthlyTotalRow({ total_birr: '12500.75' });
      expect(result.status).toBe('loaded');
      if (result.status === 'loaded') {
        expect(result.amount).toBe(12500.75);
      }
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Zero, null, or empty row -> status: "empty"', () => {
    it('returns empty for null row (no row returned by database)', () => {
      const result = parseMonthlyTotalRow(null);
      expect(result.status).toBe('empty');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('returns empty for undefined row', () => {
      const result = parseMonthlyTotalRow(undefined);
      expect(result.status).toBe('empty');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('returns empty for { total_birr: null } (e.g. SUM over zero rows)', () => {
      const result = parseMonthlyTotalRow({ total_birr: null });
      expect(result.status).toBe('empty');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('returns empty for numeric 0', () => {
      const result = parseMonthlyTotalRow({ total_birr: 0 });
      expect(result.status).toBe('empty');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('returns empty for string "0"', () => {
      const result = parseMonthlyTotalRow({ total_birr: '0' });
      expect(result.status).toBe('empty');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('returns empty for string "0.00"', () => {
      const result = parseMonthlyTotalRow({ total_birr: '0.00' });
      expect(result.status).toBe('empty');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Invalid and malformed inputs -> status: "error" (and logs error)', () => {
    it('returns error for empty string ("")', () => {
      const result = parseMonthlyTotalRow({ total_birr: '' });
      expect(result.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns error for whitespace string ("   ")', () => {
      const result = parseMonthlyTotalRow({ total_birr: '   ' });
      expect(result.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns error for non-numeric string ("abc")', () => {
      const result = parseMonthlyTotalRow({ total_birr: 'abc' });
      expect(result.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns error for array ([])', () => {
      const result = parseMonthlyTotalRow({ total_birr: [] });
      expect(result.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns error for object ({})', () => {
      const result = parseMonthlyTotalRow({ total_birr: {} });
      expect(result.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns error for negative number (-10)', () => {
      const result = parseMonthlyTotalRow({ total_birr: -10 });
      expect(result.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns error for negative string ("-10")', () => {
      const result = parseMonthlyTotalRow({ total_birr: '-10' });
      expect(result.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns error for NaN', () => {
      const result = parseMonthlyTotalRow({ total_birr: NaN });
      expect(result.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns error for Infinity', () => {
      const result = parseMonthlyTotalRow({ total_birr: Infinity });
      expect(result.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns error when row is not an object (e.g. array of rows)', () => {
      const result = parseMonthlyTotalRow(['unexpected']);
      expect(result.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});

describe('Task 5: Number Formatting Helper', () => {
  it('formats 12500 as "12,500" with Latin digits', () => {
    expect(formatMonthlyTotal(12500)).toBe('12,500');
  });

  it('formats 0 as "0"', () => {
    expect(formatMonthlyTotal(0)).toBe('0');
  });

  it('formats large numbers (1000000) with proper separators', () => {
    expect(formatMonthlyTotal(1000000)).toBe('1,000,000');
    expect(formatMonthlyTotal(25500750)).toBe('25,500,750');
  });

  it('handles negative or invalid number gracefully by falling back to 0', () => {
    expect(formatMonthlyTotal(-50)).toBe('0');
    expect(formatMonthlyTotal(NaN)).toBe('0');
  });
});
