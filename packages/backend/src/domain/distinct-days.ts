import { DateTime } from 'luxon';

/**
 * Conta dias de calendário distintos entre os instantes, no fuso do usuário.
 * Dois checks no mesmo dia (no `timezone`) contam como 1. Calendário via Luxon.
 */
export function countDistinctDays(instants: Date[], timezone: string): number {
  const days = new Set<string>();
  for (const instant of instants) {
    const iso = DateTime.fromJSDate(instant, { zone: timezone }).toISODate();
    if (iso) days.add(iso);
  }
  return days.size;
}
