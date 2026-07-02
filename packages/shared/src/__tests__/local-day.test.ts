import { describe, expect, it } from 'vitest';

import {
  currentMonthISO,
  FALLBACK_TIMEZONE,
  shiftMonth,
  todayISO,
} from '../local-day.js';

// 2026-07-02T01:30Z = 2026-07-01 22:30 em São Paulo (UTC-3, sem DST).
const LATE_NIGHT_UTC = new Date('2026-07-02T01:30:00.000Z');

describe('todayISO', () => {
  it('resolves the calendar day in the given IANA timezone', () => {
    expect(todayISO('America/Sao_Paulo', LATE_NIGHT_UTC)).toBe('2026-07-01');
    expect(todayISO('UTC', LATE_NIGHT_UTC)).toBe('2026-07-02');
    expect(todayISO('Asia/Tokyo', LATE_NIGHT_UTC)).toBe('2026-07-02');
  });

  it('flips exactly at the local midnight boundary (SP = UTC-3)', () => {
    expect(
      todayISO('America/Sao_Paulo', new Date('2026-07-02T02:59:59.999Z')),
    ).toBe('2026-07-01');
    expect(
      todayISO('America/Sao_Paulo', new Date('2026-07-02T03:00:00.000Z')),
    ).toBe('2026-07-02');
  });
});

describe('currentMonthISO', () => {
  it('resolves the calendar month in the given timezone', () => {
    // 2026-07-01T00:30Z ainda é 30 de junho em SP.
    const utcMonthStart = new Date('2026-07-01T00:30:00.000Z');
    expect(currentMonthISO('America/Sao_Paulo', utcMonthStart)).toBe('2026-06');
    expect(currentMonthISO('UTC', utcMonthStart)).toBe('2026-07');
  });
});

describe('shiftMonth', () => {
  it('shifts forward and backward', () => {
    expect(shiftMonth('2026-06', 1)).toBe('2026-07');
    expect(shiftMonth('2026-06', -1)).toBe('2026-05');
  });

  it('wraps across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-03', -15)).toBe('2024-12');
    expect(shiftMonth('2026-03', 24)).toBe('2028-03');
  });
});

describe('FALLBACK_TIMEZONE', () => {
  it('is the single app-wide fallback', () => {
    expect(FALLBACK_TIMEZONE).toBe('America/Sao_Paulo');
  });
});
