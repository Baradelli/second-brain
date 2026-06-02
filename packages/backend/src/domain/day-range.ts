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
 * The bank stores UTC; "what day is today" is always derived from the user's timezone.
 * All calendar arithmetic goes through Luxon — never scattered in callers.
 */
export function dayRange(reference: Date, timezone: string, scope: NoteScope = 'DAY'): DateRange {
  const unit = scope.toLowerCase() as 'day' | 'week' | 'month' | 'year';
  const dt = DateTime.fromJSDate(reference, { zone: timezone });

  const from = dt.startOf(unit).toUTC().toJSDate();
  const to = dt.endOf(unit).toUTC().toJSDate();

  return { from, to };
}
