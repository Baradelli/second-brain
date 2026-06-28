import type {
  RecallScheduleResponse,
  StudyItemResponse,
} from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import {
  confidenceSummary,
  durabilityKey,
  isDue,
  recallsDone,
  scheduleHint,
  studyItemLabel,
} from '../study-display.js';

function makeSchedule(
  over: Partial<RecallScheduleResponse> = {},
): RecallScheduleResponse {
  return {
    index: 0,
    consolidated: false,
    nextRecallAt: '2026-07-01T00:00:00.000Z',
    dueToday: false,
    overdue: false,
    ...over,
  };
}

describe('studyItemLabel', () => {
  it('uses the title when present, trimming whitespace', () => {
    expect(studyItemLabel({ title: '  Cap. 3  ' }, 'fallback')).toBe('Cap. 3');
  });

  it('falls back when the title is empty or whitespace', () => {
    expect(studyItemLabel({ title: '   ' }, 'Sem título')).toBe('Sem título');
  });
});

describe('scheduleHint', () => {
  it('consolidated wins over everything (muted)', () => {
    const hint = scheduleHint(
      makeSchedule({ consolidated: true, dueToday: true, overdue: true }),
    );
    expect(hint).toEqual({ kind: 'consolidated', tone: 'muted' });
  });

  it('overdue when due today and overdue', () => {
    const hint = scheduleHint(makeSchedule({ dueToday: true, overdue: true }));
    expect(hint).toEqual({ kind: 'overdue', tone: 'overdue' });
  });

  it('dueToday when due but not overdue', () => {
    const hint = scheduleHint(makeSchedule({ dueToday: true, overdue: false }));
    expect(hint).toEqual({ kind: 'dueToday', tone: 'due' });
  });

  it('next when not due and not consolidated', () => {
    const hint = scheduleHint(makeSchedule({ dueToday: false }));
    expect(hint).toEqual({ kind: 'next', tone: 'muted' });
  });
});

describe('isDue', () => {
  it('is true when due today and not consolidated', () => {
    expect(isDue(makeSchedule({ dueToday: true }))).toBe(true);
  });

  it('is false once consolidated even if dueToday is stale', () => {
    expect(isDue(makeSchedule({ dueToday: true, consolidated: true }))).toBe(
      false,
    );
  });

  it('is false when not due', () => {
    expect(isDue(makeSchedule({ dueToday: false }))).toBe(false);
  });
});

describe('durabilityKey', () => {
  const base: Pick<StudyItemResponse, 'status' | 'schedule'> = {
    status: 'ACTIVE',
    schedule: makeSchedule(),
  };

  it('active by default', () => {
    expect(durabilityKey(base)).toBe('active');
  });

  it('archived when status is ARCHIVED', () => {
    expect(durabilityKey({ ...base, status: 'ARCHIVED' })).toBe('archived');
  });

  it('consolidated when status is CONSOLIDATED', () => {
    expect(durabilityKey({ ...base, status: 'CONSOLIDATED' })).toBe(
      'consolidated',
    );
  });

  it('consolidated when the schedule consolidated even if status lags', () => {
    expect(
      durabilityKey({
        status: 'ACTIVE',
        schedule: makeSchedule({ consolidated: true }),
      }),
    ).toBe('consolidated');
  });
});

describe('recallsDone', () => {
  it('reads the schedule index', () => {
    expect(recallsDone(makeSchedule({ index: 2 }))).toBe(2);
  });

  it('clamps into [0, 3]', () => {
    expect(recallsDone(makeSchedule({ index: -1 }))).toBe(0);
    expect(recallsDone(makeSchedule({ index: 9 }))).toBe(3);
  });
});

describe('confidenceSummary', () => {
  it('returns null when there is no history', () => {
    expect(confidenceSummary([])).toBeNull();
  });

  it('counts each letter and the total', () => {
    expect(confidenceSummary(['A', 'C', 'C', 'B'])).toEqual({
      A: 1,
      B: 1,
      C: 2,
      total: 4,
    });
  });
});
