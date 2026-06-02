import type { NoteScope } from '@cerebro/shared';

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Returns the UTC timestamp that corresponds to midnight (00:00:00.000) on a given
 * calendar date (year/month/day) in the specified IANA timezone.
 *
 * Strategy: take the naive UTC midnight for that date, observe what local time it shows
 * in the target timezone, derive the UTC offset, then subtract the offset.
 */
function localMidnightUtc(year: number, month: number, day: number, timezone: string): Date {
  const naiveUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(naiveUtcMs));

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const localAsUtcMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));

  // offset = localAsUtc - actualUtc → actual local midnight UTC = naiveUtc - offset
  const offsetMs = localAsUtcMs - naiveUtcMs;
  return new Date(naiveUtcMs - offsetMs);
}

function getLocalDate(date: Date, timezone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Calculates the UTC [from, to] range (both inclusive) for a given scope
 * centered on `reference`, using the user's IANA `timezone`.
 *
 * The bank stores UTC; "what day is today" is always derived from the user's timezone here.
 */
export function dayRange(reference: Date, timezone: string, scope: NoteScope = 'DAY'): DateRange {
  const { year, month, day } = getLocalDate(reference, timezone);

  switch (scope) {
    case 'DAY': {
      const from = localMidnightUtc(year, month, day, timezone);
      const to = new Date(localMidnightUtc(year, month, day + 1, timezone).getTime() - 1);
      return { from, to };
    }
    case 'WEEK': {
      // ISO week: Monday–Sunday
      // Use getUTCDay() to avoid server timezone affecting the weekday calculation
      const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      const daysToMonday = jsDay === 0 ? -6 : 1 - jsDay;
      const monday = day + daysToMonday;
      const from = localMidnightUtc(year, month, monday, timezone);
      const to = new Date(localMidnightUtc(year, month, monday + 7, timezone).getTime() - 1);
      return { from, to };
    }
    case 'MONTH': {
      const from = localMidnightUtc(year, month, 1, timezone);
      const to = new Date(localMidnightUtc(year, month + 1, 1, timezone).getTime() - 1);
      return { from, to };
    }
    case 'YEAR': {
      const from = localMidnightUtc(year, 1, 1, timezone);
      const to = new Date(localMidnightUtc(year + 1, 1, 1, timezone).getTime() - 1);
      return { from, to };
    }
  }
}
