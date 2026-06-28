// Lógica pura do calendário (sem React, sem rede) — para testar com Vitest sem DOM.
// Toda matemática de mês/grade usa Luxon (DateTime), NUNCA `new Date`, conforme as
// regras do projeto: trocar de lib mexe só aqui. O "dia local" (timezone do Settings)
// já vem resolvido do backend nas strings `YYYY-MM-DD`; aqui só montamos a grade
// visual (semanas, células, blanks de início) a partir do mês.

import type { CalendarDayResponse } from '@cerebro/shared';
import { DateTime } from 'luxon';

/** Mês corrente ('YYYY-MM'). Usa a hora local de quem olha — bom o bastante para abrir. */
export function currentMonthKey(now: DateTime = DateTime.local()): string {
  return now.toFormat('yyyy-MM');
}

/** Desloca um mês 'YYYY-MM' por `delta` meses, devolvendo 'YYYY-MM'. */
export function shiftMonth(month: string, delta: number): string {
  return DateTime.fromFormat(month, 'yyyy-MM').plus({ months: delta }).toFormat('yyyy-MM');
}

/**
 * Quantas células em branco antes do dia 1 (alinhamento da grade).
 * `firstWeekday` 0=Dom..6=Sáb — o cabeçalho do calendário começa no domingo.
 * Luxon usa weekday 1=Seg..7=Dom; convertemos para o índice 0=Dom..6=Sáb.
 */
export function leadingBlanks(month: string): number {
  const first = DateTime.fromFormat(month, 'yyyy-MM').startOf('month');
  return first.weekday % 7; // 7(Dom)→0, 1(Seg)→1, ..., 6(Sáb)→6
}

/** Número do dia (1..31) a partir de uma string 'YYYY-MM-DD' — sem `new Date`. */
export function dayNumber(date: string): number {
  return DateTime.fromISO(date).day;
}

export interface MonthGridCell {
  /** `null` numa célula em branco (antes do dia 1). */
  day: CalendarDayResponse | null;
  /** Chave estável para o React. */
  key: string;
}

/**
 * Monta a grade do mês: N blanks de início (alinhar o dia 1 ao dia da semana) +
 * uma célula por dia que o backend devolveu. Não inventa dias: confia em `days`
 * (o backend já listou os dias do mês, no timezone do Settings).
 */
export function buildMonthGrid(
  month: string,
  days: CalendarDayResponse[],
): MonthGridCell[] {
  const blanks: MonthGridCell[] = Array.from(
    { length: leadingBlanks(month) },
    (_, i) => ({ day: null, key: `blank-${i}` }),
  );
  const cells: MonthGridCell[] = days.map((day) => ({ day, key: day.date }));
  return [...blanks, ...cells];
}

/** Há atividade de metas no dia? (previstas ou cumpridas). */
export function dayHasGoals(day: CalendarDayResponse): boolean {
  return day.goalsPlanned > 0 || day.goalsDone > 0;
}

/** Há diário (devocional ou reflexão) no dia? */
export function dayHasJournal(day: CalendarDayResponse): boolean {
  return day.journal.devotional || day.journal.reflection;
}

/**
 * Título do mês ('YYYY-MM') no idioma ativo, ex.: "junho de 2026". Formatação de
 * apresentação via Luxon (sem `new Date`); o dia/mês já é o do calendário pedido.
 */
export function monthTitle(month: string, locale: string): string {
  return DateTime.fromFormat(month, 'yyyy-MM')
    .setLocale(locale)
    .toFormat('LLLL yyyy');
}

/**
 * Nomes curtos dos dias da semana, começando no domingo (índice 0 do cabeçalho).
 * Luxon ordena Seg..Dom; rotacionamos para Dom..Sáb. Só apresentação.
 */
export function weekdayNarrowNames(locale: string): string[] {
  // 2026-06-07 é um domingo — caminhamos 7 dias a partir dele.
  const sunday = DateTime.fromISO('2026-06-07').setLocale(locale);
  return Array.from({ length: 7 }, (_, i) =>
    sunday.plus({ days: i }).toFormat('ccccc'),
  );
}

/** Dia local de hoje ('YYYY-MM-DD') na hora local de quem olha — para destacar "hoje". */
export function todayKey(now: DateTime = DateTime.local()): string {
  return now.toFormat('yyyy-MM-dd');
}

/** Data longa de um dia ('YYYY-MM-DD') no idioma ativo (formato localizado do Luxon). */
export function longDateLabel(date: string, locale: string): string {
  return DateTime.fromISO(date)
    .setLocale(locale)
    .toLocaleString(DateTime.DATE_HUGE);
}
