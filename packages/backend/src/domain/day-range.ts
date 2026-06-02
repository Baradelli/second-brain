import { DateTime } from 'luxon';
import type { NoteScope } from '@cerebro/shared';

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Calculates the UTC [from, to] range (both inclusive) for a given scope
 * centered on `reference`, using the user's IANA `timezone`.
 *
 * `weekStartsOn`: 0=Sun, 1=Mon (ISO default), ..., 6=Sat — mirrors Settings.recapWeekday.
 * All calendar arithmetic uses Luxon; `new Date` only for trivial instants.
 */
export function dayRange(
  reference: Date,
  timezone: string,
  scope: NoteScope = 'DAY',
  weekStartsOn = 1,
): DateRange {
  const dt = DateTime.fromJSDate(reference, { zone: timezone });

  if (scope === 'WEEK') {
    // Luxon weekday: Mon=1 … Sat=6, Sun=7. Convert to 0=Sun … 6=Sat:
    const luxonDay = dt.weekday % 7;
    const daysBack = (luxonDay - weekStartsOn + 7) % 7;
    const weekStart = dt.minus({ days: daysBack }).startOf('day');
    return {
      from: weekStart.toUTC().toJSDate(),
      to: weekStart.plus({ days: 7 }).minus({ milliseconds: 1 }).toUTC().toJSDate(),
    };
  }

  const unit = scope.toLowerCase() as 'day' | 'month' | 'year';
  return {
    from: dt.startOf(unit).toUTC().toJSDate(),
    to: dt.endOf(unit).toUTC().toJSDate(),
  };
}
