/**
 * Helpers puros de "dia local": convertem um instante (`Date`) no dia/mês do
 * calendário de um fuso IANA. São o espelho front-end dos helpers de data do
 * backend (`domain/day-range.ts`, Luxon): toda conta "instante ↔ dia do
 * calendário" dos apps passa por aqui — nunca `new Date()` espalhado em tela.
 *
 * Implementação via `Intl.DateTimeFormat` (nativo em browser e Node): zero
 * dependência no bundle do mobile. O Luxon continua sendo a lib de datas do
 * backend; aqui só resolvemos "que dia é agora no fuso X".
 */

/** Fallback único de timezone do app (o mesmo do `DEFAULT_SETTINGS` do backend). */
export const FALLBACK_TIMEZONE = 'America/Sao_Paulo';

/** Dia do calendário ('YYYY-MM-DD') do instante `now` no fuso `timezone`. */
export function todayISO(timezone: string, now: Date = new Date()): string {
  // O locale en-CA formata nativamente como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Mês do calendário ('YYYY-MM') do instante `now` no fuso `timezone`. */
export function currentMonthISO(
  timezone: string,
  now: Date = new Date(),
): string {
  return todayISO(timezone, now).slice(0, 7);
}

/** Desloca um mês 'YYYY-MM' por `delta` meses — aritmética pura, sem `Date`. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = (y as number) * 12 + ((m as number) - 1) + delta;
  const year = Math.floor(total / 12);
  const mon = (total % 12) + 1;
  return `${year}-${String(mon).padStart(2, '0')}`;
}
