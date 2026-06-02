import { describe, it, expect } from 'vitest';
import { dayRange } from '../day-range.js';

const TZ = 'America/Sao_Paulo'; // UTC-3 in June (no DST)

describe('dayRange — scope DAY', () => {
  it('note created at 22h local (01:00 UTC next day) falls INSIDE the correct local day', () => {
    // reference = 2026-06-02T01:00:00Z = June 1st 22:00 São Paulo
    const reference = new Date('2026-06-02T01:00:00.000Z');
    const { from, to } = dayRange(reference, TZ, 'DAY');

    // Local day is June 1st; expected range in UTC:
    // from = June 1 00:00 SP = June 1 03:00 UTC
    // to   = June 1 23:59:59.999 SP = June 2 02:59:59.999 UTC
    expect(from).toEqual(new Date('2026-06-01T03:00:00.000Z'));
    expect(to).toEqual(new Date('2026-06-02T02:59:59.999Z'));

    // The note date (01:00 UTC on June 2nd) must fall within this range
    const noteDate = new Date('2026-06-02T01:00:00.000Z');
    expect(noteDate >= from && noteDate <= to).toBe(true);
  });

  it('from is midnight local time converted to UTC', () => {
    // reference = June 2nd 12:00 UTC = June 2nd 09:00 São Paulo
    const reference = new Date('2026-06-02T12:00:00.000Z');
    const { from } = dayRange(reference, TZ, 'DAY');
    // June 2 00:00 SP = June 2 03:00 UTC
    expect(from).toEqual(new Date('2026-06-02T03:00:00.000Z'));
  });

  it('to is the last millisecond of the local day', () => {
    const reference = new Date('2026-06-02T12:00:00.000Z');
    const { to } = dayRange(reference, TZ, 'DAY');
    // June 2 23:59:59.999 SP = June 3 02:59:59.999 UTC
    expect(to).toEqual(new Date('2026-06-03T02:59:59.999Z'));
  });
});

describe('dayRange — scope WEEK', () => {
  it('returns a 7-day interval (Monday–Sunday local week)', () => {
    // June 1 2026 is a Monday in São Paulo
    const reference = new Date('2026-06-01T12:00:00.000Z'); // 09:00 SP on Monday
    const { from, to } = dayRange(reference, TZ, 'WEEK');

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(to.getTime() - from.getTime() + 1).toBe(sevenDaysMs);
  });

  it('week starting mid-week still covers Monday to Sunday', () => {
    // June 2 2026 is a Tuesday
    const reference = new Date('2026-06-02T12:00:00.000Z'); // Tuesday
    const { from, to } = dayRange(reference, TZ, 'WEEK');

    // Monday of this week = June 1 00:00 SP = June 1 03:00 UTC
    expect(from).toEqual(new Date('2026-06-01T03:00:00.000Z'));
    // Sunday end = June 7 23:59:59.999 SP = June 8 02:59:59.999 UTC
    expect(to).toEqual(new Date('2026-06-08T02:59:59.999Z'));
  });
});
