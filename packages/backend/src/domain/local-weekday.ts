import { DateTime } from 'luxon';

/**
 * Dia da semana de `reference` no fuso do usuário, na convenção 0=domingo..6=sábado
 * (mesma de `Goal.weekdays` e `Settings.reviewWeekday`). Calendário via Luxon.
 */
export function localWeekday(reference: Date, timezone: string): number {
  // Luxon: Mon=1..Sun=7 → 0=Sun..6=Sat.
  return DateTime.fromJSDate(reference, { zone: timezone }).weekday % 7;
}
