import { describe, expect, it } from 'vitest';

import { localDayKey, monthDayKeys } from '../calendar-month.js';

const SP = 'America/Sao_Paulo'; // UTC-3

describe('localDayKey', () => {
  it('formats the local day of a UTC instant', () => {
    expect(localDayKey(new Date('2026-06-03T12:00:00.000Z'), SP)).toBe(
      '2026-06-03',
    );
  });

  it('rolls back to the previous local day near midnight', () => {
    // 02:00Z is 23:00 of the previous day in São Paulo (UTC-3).
    expect(localDayKey(new Date('2026-06-03T02:00:00.000Z'), SP)).toBe(
      '2026-06-02',
    );
  });

  it('respects UTC when timezone is UTC', () => {
    expect(localDayKey(new Date('2026-06-03T02:00:00.000Z'), 'UTC')).toBe(
      '2026-06-03',
    );
  });
});

describe('monthDayKeys', () => {
  it('lists every day of a 30-day month in order', () => {
    const days = monthDayKeys('2026-06', SP);
    expect(days).toHaveLength(30);
    expect(days[0]).toBe('2026-06-01');
    expect(days[29]).toBe('2026-06-30');
  });

  it('handles 31-day months', () => {
    expect(monthDayKeys('2026-07', SP)).toHaveLength(31);
  });

  it('handles February (non-leap year)', () => {
    expect(monthDayKeys('2026-02', SP)).toHaveLength(28);
  });

  it('handles February (leap year)', () => {
    expect(monthDayKeys('2024-02', SP)).toHaveLength(29);
  });

  it('throws on an invalid month', () => {
    expect(() => monthDayKeys('2026-13', SP)).toThrow();
    expect(() => monthDayKeys('nope', SP)).toThrow();
  });
});
