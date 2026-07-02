import type { NoteScope } from '@cerebro/shared';
import { DateTime } from 'luxon';

import { DEFAULT_WEEK_STARTS_ON } from './settings.js';

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Calculates the UTC [from, to] range (both inclusive) for a given scope
 * centered on `reference`, using the user's IANA `timezone`.
 *
 * `weekStartsOn`: 0=Sun, ..., 6=Sat — SEMPRE o `Settings.recapWeekday` do
 * usuário (a única noção de semana do app, Tarefa 75); o default é o mesmo
 * do Settings (domingo). All calendar arithmetic uses Luxon.
 */
export function dayRange(
  reference: Date,
  timezone: string,
  scope: NoteScope = 'DAY',
  weekStartsOn: number = DEFAULT_WEEK_STARTS_ON,
): DateRange {
  const dt = DateTime.fromJSDate(reference, { zone: timezone });

  if (scope === 'WEEK') {
    // Luxon weekday: Mon=1 … Sat=6, Sun=7. Convert to 0=Sun … 6=Sat:
    const luxonDay = dt.weekday % 7;
    const daysBack = (luxonDay - weekStartsOn + 7) % 7;
    const weekStart = dt.minus({ days: daysBack }).startOf('day');
    return {
      from: weekStart.toUTC().toJSDate(),
      to: weekStart
        .plus({ days: 7 })
        .minus({ milliseconds: 1 })
        .toUTC()
        .toJSDate(),
    };
  }

  const unit = scope.toLowerCase() as 'day' | 'month' | 'year';
  return {
    from: dt.startOf(unit).toUTC().toJSDate(),
    to: dt.endOf(unit).toUTC().toJSDate(),
  };
}
