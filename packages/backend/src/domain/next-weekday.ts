import { DateTime } from 'luxon';

/**
 * Returns the UTC Date for the start of the next (or current) occurrence of
 * `weekday` (0=Sun … 6=Sat) in the user's timezone.
 *
 * Rule: if today IS the target weekday → return today's midnight (local → UTC).
 * This means a capture made on the review day is already due for review today.
 */
export function nextWeekday(
  reference: Date,
  timezone: string,
  weekday: number,
): Date {
  const dt = DateTime.fromJSDate(reference, { zone: timezone });
  // Luxon: Mon=1…Sat=6, Sun=7 → convert to 0=Sun…6=Sat
  const currentDay = dt.weekday % 7;
  const daysUntil = (weekday - currentDay + 7) % 7;
  return dt.plus({ days: daysUntil }).startOf('day').toUTC().toJSDate();
}
