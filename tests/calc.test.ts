import { describe, expect, it } from 'vitest';
import { e1rm, formatKg, isNewRecord, round, setVolume, totalVolume } from '../src/domain/calc';
import { validateSetFields } from '../src/domain/validation';
import { addDays, isValidDateStr, monthGrid, monthRange } from '../src/lib/dates';

describe('calc', () => {
  it('estimates 1RM with Epley', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(round(e1rm(100, 10), 1)).toBe(133.3);
  });

  it('computes volume with the weight as entered', () => {
    expect(setVolume({ weightKg: 20, reps: 10 })).toBe(200);
    expect(totalVolume([{ weightKg: 20, reps: 10 }, { weightKg: 10, reps: 5 }])).toBe(250);
  });

  it('formats kilograms without trailing zeros', () => {
    expect(formatKg(20)).toBe('20');
    expect(formatKg(22.5)).toBe('22.5');
  });

  it('detects records, never for the first set or 0 kg', () => {
    const prev = [{ weightKg: 50, reps: 8 }];
    expect(isNewRecord([], { weightKg: 60, reps: 5 })).toBe(false);
    expect(isNewRecord(prev, { weightKg: 52.5, reps: 5 })).toBe(true);
    expect(isNewRecord(prev, { weightKg: 45, reps: 8 })).toBe(false);
    expect(isNewRecord(prev, { weightKg: 0, reps: 20 })).toBe(false);
  });
});

describe('validation', () => {
  it('accepts valid sets and comma decimals', () => {
    const r = validateSetFields('10', '22,5', '8');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ reps: 10, weightKg: 22.5, rpe: 8 });
  });

  it('rejects bad input', () => {
    expect(validateSetFields('0', '20', '').ok).toBe(false);
    expect(validateSetFields('5', '-1', '').ok).toBe(false);
    expect(validateSetFields('5', '20', '11').ok).toBe(false);
    expect(validateSetFields('abc', '20', '').ok).toBe(false);
  });
});

describe('dates', () => {
  it('validates and shifts dates', () => {
    expect(isValidDateStr('2026-02-30')).toBe(false);
    expect(isValidDateStr('2026-10-13')).toBe(true);
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });

  it('builds a Monday-first month grid', () => {
    const cells = monthGrid(2026, 9); // October 2026 starts on Thursday
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]).toBe('2026-10-01');
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(monthRange(2026, 11)).toEqual({ start: '2026-12-01', end: '2027-01-01' });
  });
});
