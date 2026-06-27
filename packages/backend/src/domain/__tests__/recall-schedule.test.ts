import { describe, expect, it } from 'vitest';

import { computeRecallSchedule, LADDER_DAYS } from '../recall-schedule.js';

const UTC = 'UTC';

describe('computeRecallSchedule', () => {
  it('exposes the fixed ladder 2 → 7 → 30 days', () => {
    expect(LADDER_DAYS).toEqual([2, 7, 30]);
  });

  it('0 recalls: next is createdAt + 2 days, not consolidated', () => {
    const createdAt = new Date('2026-06-01T10:00:00.000Z');
    const s = computeRecallSchedule({
      createdAt,
      recalls: [],
      timezone: UTC,
      reference: new Date('2026-06-01T10:00:00.000Z'),
    });

    expect(s.index).toBe(0);
    expect(s.consolidated).toBe(false);
    expect(s.nextRecallAt?.toISOString()).toBe('2026-06-03T10:00:00.000Z');
  });

  it('1 recall: next is last recall + 7 days', () => {
    const s = computeRecallSchedule({
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      recalls: [{ occurredAt: new Date('2026-06-03T10:00:00.000Z') }],
      timezone: UTC,
      reference: new Date('2026-06-03T10:00:00.000Z'),
    });

    expect(s.index).toBe(1);
    expect(s.nextRecallAt?.toISOString()).toBe('2026-06-10T10:00:00.000Z');
  });

  it('2 recalls: next is last recall + 30 days', () => {
    const s = computeRecallSchedule({
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      recalls: [
        { occurredAt: new Date('2026-06-03T10:00:00.000Z') },
        { occurredAt: new Date('2026-06-10T10:00:00.000Z') },
      ],
      timezone: UTC,
      reference: new Date('2026-06-10T10:00:00.000Z'),
    });

    expect(s.index).toBe(2);
    expect(s.nextRecallAt?.toISOString()).toBe('2026-07-10T10:00:00.000Z');
  });

  it('3 recalls: consolidated, no next, never due', () => {
    const s = computeRecallSchedule({
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      recalls: [
        { occurredAt: new Date('2026-06-03T10:00:00.000Z') },
        { occurredAt: new Date('2026-06-10T10:00:00.000Z') },
        { occurredAt: new Date('2026-07-10T10:00:00.000Z') },
      ],
      timezone: UTC,
      reference: new Date('2026-08-01T10:00:00.000Z'),
    });

    expect(s.index).toBe(3);
    expect(s.consolidated).toBe(true);
    expect(s.nextRecallAt).toBeNull();
    expect(s.dueToday).toBe(false);
    expect(s.overdue).toBe(false);
  });

  it('uses the latest occurredAt as base even when recalls are out of order', () => {
    const s = computeRecallSchedule({
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      recalls: [{ occurredAt: new Date('2026-06-10T10:00:00.000Z') }], // index 1 → +7
      timezone: UTC,
      reference: new Date('2026-06-10T10:00:00.000Z'),
    });
    // sanity: with two out-of-order recalls, base = max
    const s2 = computeRecallSchedule({
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      recalls: [
        { occurredAt: new Date('2026-06-10T10:00:00.000Z') },
        { occurredAt: new Date('2026-06-03T10:00:00.000Z') },
      ], // index 2 → max(June 10) + 30
      timezone: UTC,
      reference: new Date('2026-06-10T10:00:00.000Z'),
    });

    expect(s.nextRecallAt?.toISOString()).toBe('2026-06-17T10:00:00.000Z');
    expect(s2.nextRecallAt?.toISOString()).toBe('2026-07-10T10:00:00.000Z');
  });

  describe('dueToday / overdue (compared by local calendar day)', () => {
    const createdAt = new Date('2026-06-01T10:00:00.000Z'); // next = June 3 (UTC)

    it('reference before the due day: not due', () => {
      const s = computeRecallSchedule({
        createdAt,
        recalls: [],
        timezone: UTC,
        reference: new Date('2026-06-02T23:00:00.000Z'),
      });
      expect(s.dueToday).toBe(false);
      expect(s.overdue).toBe(false);
    });

    it('reference on the due day: due, not overdue', () => {
      const s = computeRecallSchedule({
        createdAt,
        recalls: [],
        timezone: UTC,
        reference: new Date('2026-06-03T08:00:00.000Z'),
      });
      expect(s.dueToday).toBe(true);
      expect(s.overdue).toBe(false);
    });

    it('reference after the due day: due and overdue', () => {
      const s = computeRecallSchedule({
        createdAt,
        recalls: [],
        timezone: UTC,
        reference: new Date('2026-06-04T00:00:00.000Z'),
      });
      expect(s.dueToday).toBe(true);
      expect(s.overdue).toBe(true);
    });
  });

  it('decides by LOCAL day, not the UTC instant (America/Sao_Paulo)', () => {
    // createdAt 12:00Z = 09:00 in SP (UTC-3). +2 days → June 3 09:00 SP = 12:00Z.
    // reference 2026-06-04T02:00:00Z = June 3 23:00 in SP → same LOCAL day as next.
    // A naive UTC-day comparison would treat reference (June 4 UTC) as overdue.
    const s = computeRecallSchedule({
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
      recalls: [],
      timezone: 'America/Sao_Paulo',
      reference: new Date('2026-06-04T02:00:00.000Z'),
    });

    expect(s.dueToday).toBe(true);
    expect(s.overdue).toBe(false);
  });
});
