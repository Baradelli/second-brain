import type { GoalResponse } from '@cerebro/shared';
import { describe, expect, it } from 'vitest';

import {
  cadenceDescriptor,
  goalActions,
  goalLabel,
  goalProgressPercent,
} from '../goal-display.js';

describe('goalLabel', () => {
  it('uses the title when present', () => {
    expect(goalLabel({ title: 'Ler 30min' }, 'fallback')).toBe('Ler 30min');
  });

  it('trims surrounding whitespace', () => {
    expect(goalLabel({ title: '  Correr  ' }, 'fallback')).toBe('Correr');
  });

  it('falls back when the title is empty or whitespace', () => {
    expect(goalLabel({ title: '' }, 'Sem título')).toBe('Sem título');
    expect(goalLabel({ title: '   ' }, 'Sem título')).toBe('Sem título');
  });
});

describe('goalProgressPercent', () => {
  it('converts ratio to an integer percent', () => {
    expect(goalProgressPercent({ ratio: 0.5 })).toBe(50);
    expect(goalProgressPercent({ ratio: 0.333 })).toBe(33);
  });

  it('treats a null ratio as 0 (e.g. TARGET without a goal)', () => {
    expect(goalProgressPercent({ ratio: null })).toBe(0);
    expect(goalProgressPercent(undefined)).toBe(0);
  });

  it('clamps to the 0–100 range', () => {
    expect(goalProgressPercent({ ratio: 1.4 })).toBe(100);
    expect(goalProgressPercent({ ratio: -0.2 })).toBe(0);
  });
});

describe('goalActions', () => {
  it('UMBRELLA only completes (no check/skip/undo)', () => {
    expect(goalActions('UMBRELLA')).toEqual({
      check: false,
      checkNeedsValue: false,
      canUndo: false,
      skip: false,
      complete: true,
    });
  });

  it('HABIT checks without a value, can undo today, and skips', () => {
    expect(goalActions('HABIT')).toEqual({
      check: true,
      checkNeedsValue: false,
      canUndo: true,
      skip: true,
      complete: false,
    });
  });

  it('TARGET/PROJECT check with a value and skip, no undo or complete', () => {
    const target = goalActions('TARGET');
    expect(target.checkNeedsValue).toBe(true);
    expect(target.canUndo).toBe(false);
    expect(target.complete).toBe(false);
    expect(goalActions('PROJECT')).toEqual(target);
  });
});

describe('cadenceDescriptor', () => {
  const base: Pick<
    GoalResponse,
    'type' | 'weekdays' | 'period' | 'timesPerPeriod' | 'targetValue' | 'unit'
  > = {
    type: 'HABIT',
    weekdays: [],
    period: null,
    timesPerPeriod: null,
    targetValue: null,
    unit: null,
  };

  it('reads HABIT weekdays (sorted)', () => {
    expect(cadenceDescriptor({ ...base, weekdays: [3, 1, 0] })).toEqual({
      kind: 'weekdays',
      weekdays: [0, 1, 3],
    });
  });

  it('reads HABIT period + times when no weekdays', () => {
    expect(
      cadenceDescriptor({ ...base, period: 'week', timesPerPeriod: 3 }),
    ).toEqual({ kind: 'period', period: 'week', times: 3 });
  });

  it('reads TARGET/PROJECT target value + unit', () => {
    expect(
      cadenceDescriptor({
        ...base,
        type: 'TARGET',
        targetValue: 12,
        unit: 'livros',
      }),
    ).toEqual({ kind: 'target', targetValue: 12, unit: 'livros' });
  });

  it('returns none for an UMBRELLA or a HABIT without cadence', () => {
    expect(cadenceDescriptor({ ...base, type: 'UMBRELLA' })).toEqual({
      kind: 'none',
    });
    expect(cadenceDescriptor(base)).toEqual({ kind: 'none' });
  });
});
