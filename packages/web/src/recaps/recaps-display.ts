// Lógica pura de apresentação dos Recaps (sem React, sem rede) — testável com Vitest.
// O recap é uma Note journal com `date` (instante ISO) e um `scope` de período. O
// rótulo do período é derivado da data: a semana/mês/ano a que o recap se refere.
// Usamos Luxon para a matemática de calendário (semana ISO etc.), NUNCA `new Date`.

import type { NoteResponse, RecapScope } from '@cerebro/shared';
import { DateTime } from 'luxon';

export const RECAP_SCOPES: RecapScope[] = ['WEEK', 'MONTH', 'YEAR'];

/**
 * Como o rótulo de período de um recap deve ser formatado, derivado puramente do
 * scope + data. Devolve a "intenção" (tokens Luxon + valores) para o componente
 * formatar no idioma ativo — assim o cálculo de calendário fica testável sem
 * depender de locale. WEEK usa o início (segunda) da semana ISO da data.
 */
export interface RecapPeriodFormat {
  scope: RecapScope;
  /** DateTime já posicionado no início do período (segunda da semana / mês / ano). */
  at: DateTime;
}

export function recapPeriodFormat(
  isoDate: string,
  scope: RecapScope,
): RecapPeriodFormat {
  const dt = DateTime.fromISO(isoDate);
  if (scope === 'WEEK') return { scope, at: dt.startOf('week') };
  if (scope === 'MONTH') return { scope, at: dt.startOf('month') };
  return { scope, at: dt.startOf('year') };
}

/** Ordena recaps do mais recente para o mais antigo (por `date`), sem mutar. */
export function sortRecapsByDateDesc(notes: NoteResponse[]): NoteResponse[] {
  return [...notes].sort(
    (a, b) =>
      DateTime.fromISO(b.date).toMillis() - DateTime.fromISO(a.date).toMillis(),
  );
}

/** Chave i18n do tipo do recap (mesma semântica do editor). */
export function recapTypeKey(type: NoteResponse['type']): string {
  return type === 'DEVOTIONAL'
    ? 'editor.type.devotional'
    : 'editor.type.reflection';
}
