import { DateTime } from 'luxon';

/**
 * Dia local ('YYYY-MM-DD') de um instante UTC, no fuso do usuário. Centraliza o cálculo
 * instante↔dia do calendário (regra do projeto: Luxon, num lugar só).
 */
export function localDayKey(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant, { zone: timezone }).toFormat(
    'yyyy-MM-dd',
  );
}

/**
 * Lista 'YYYY-MM-DD' de todos os dias do mês `month` ('YYYY-MM') no fuso. Em ordem, do dia 1
 * ao último. Lança se o mês for inválido.
 */
export function monthDayKeys(month: string, timezone: string): string[] {
  const start = DateTime.fromFormat(month, 'yyyy-MM', { zone: timezone });
  if (!start.isValid) {
    throw new Error(`Invalid month: ${month}`);
  }
  const days = start.daysInMonth ?? 0;
  return Array.from({ length: days }, (_, i) =>
    start.plus({ days: i }).toFormat('yyyy-MM-dd'),
  );
}
