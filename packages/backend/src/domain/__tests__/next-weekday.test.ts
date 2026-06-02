import { describe, it, expect } from 'vitest';
import { nextWeekday } from '../next-weekday.js';

const TZ = 'America/Sao_Paulo'; // UTC-3 in June

describe('nextWeekday', () => {
  it('returns the next occurrence of the given weekday', () => {
    // June 2 2026 is Tuesday (0=Sun system: 2)
    // reviewWeekday=0 (Sunday) → next Sunday = June 7
    const ref = new Date('2026-06-02T12:00:00.000Z'); // 09:00 SP
    const result = nextWeekday(ref, TZ, 0);
    // June 7 00:00 SP = June 7 03:00 UTC
    expect(result).toEqual(new Date('2026-06-07T03:00:00.000Z'));
  });

  it('returns TODAY when today already IS the reviewWeekday (not next week)', () => {
    // June 1 2026 is Monday (0=Sun system: 1)
    const ref = new Date('2026-06-01T12:00:00.000Z'); // 09:00 SP
    const result = nextWeekday(ref, TZ, 1); // reviewWeekday = Monday
    // June 1 00:00 SP = June 1 03:00 UTC  (today, not +7 days)
    expect(result).toEqual(new Date('2026-06-01T03:00:00.000Z'));
  });

  it('respects timezone — 22:00 local is still the same local date', () => {
    // June 1 22:00 SP = June 2 01:00 UTC — local date is still Monday June 1
    const ref = new Date('2026-06-02T01:00:00.000Z');
    const result = nextWeekday(ref, TZ, 1); // reviewWeekday = Monday, today IS Monday
    expect(result).toEqual(new Date('2026-06-01T03:00:00.000Z'));
  });

  it('works for mid-week target with several days ahead', () => {
    // June 2 (Tuesday) → next Friday
    const ref = new Date('2026-06-02T12:00:00.000Z');
    const result = nextWeekday(ref, TZ, 5); // 5=Friday
    // June 5 00:00 SP = June 5 03:00 UTC
    expect(result).toEqual(new Date('2026-06-05T03:00:00.000Z'));
  });
});
