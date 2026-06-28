import type {
  RecallConfidenceInput,
  RecallScheduleResponse,
  StudyItemResponse,
} from '@cerebro/shared';

/**
 * Lógica pura de exibição/derivação de itens de estudo (Leitura Retentiva). Sem
 * React aqui — só funções puras testáveis com Vitest, espelhando a semântica do
 * mobile (StudyItemsPage). O AGENDAMENTO em si (escada fixa 2d→1sem→1mês) é
 * calculado pelo BACKEND e chega pronto em `schedule`; aqui só FORMATAMOS/
 * derivamos rótulos a partir dele — nunca recomputamos a escada.
 */

/** Título visível de um item de estudo: o título, ou um fallback se vazio. */
export function studyItemLabel(
  item: Pick<StudyItemResponse, 'title'>,
  fallback: string,
): string {
  return item.title.trim() || fallback;
}

/** Tom visual da dica de agendamento. */
export type ScheduleTone = 'overdue' | 'due' | 'muted';

/** Chave de agendamento (i18n) já decidida + tom — derivada do `schedule` do backend. */
export interface ScheduleHint {
  /** 'consolidated' | 'overdue' | 'dueToday' | 'next' — chave em `study.schedule.*`. */
  kind: 'consolidated' | 'overdue' | 'dueToday' | 'next';
  tone: ScheduleTone;
}

/**
 * Decide qual dica de agendamento mostrar a partir do `schedule` calculado pelo
 * backend (consolidado > devido/atrasado hoje > próxima data). Espelha o
 * `scheduleBadge` do mobile, mas só decide a CHAVE e o TOM — a tela traduz e
 * formata a data (i18n/locale). NÃO recomputa a escada.
 */
export function scheduleHint(schedule: RecallScheduleResponse): ScheduleHint {
  if (schedule.consolidated) return { kind: 'consolidated', tone: 'muted' };
  if (schedule.dueToday) {
    return schedule.overdue
      ? { kind: 'overdue', tone: 'overdue' }
      : { kind: 'dueToday', tone: 'due' };
  }
  return { kind: 'next', tone: 'muted' };
}

/** Há uma revisão devida (hoje ou atrasada) e o item ainda não consolidou? */
export function isDue(schedule: RecallScheduleResponse): boolean {
  return !schedule.consolidated && schedule.dueToday;
}

/**
 * Rótulo de durabilidade (i18n key em `study.durability.*`) a partir do status.
 * ACTIVE→ARCHIVED→CONSOLIDATED. Um item consolidado pelo agendamento (3 recalls)
 * também conta como consolidado mesmo que o status ainda não tenha migrado.
 */
export function durabilityKey(
  item: Pick<StudyItemResponse, 'status' | 'schedule'>,
): 'active' | 'archived' | 'consolidated' {
  if (item.status === 'ARCHIVED') return 'archived';
  if (item.status === 'CONSOLIDATED' || item.schedule.consolidated) {
    return 'consolidated';
  }
  return 'active';
}

/**
 * Quantas revisões já foram feitas (0–3), lido do `index` do agendamento do
 * backend. É o nº de recalls registradas — usado para mostrar o progresso na
 * escada (ex.: "2 de 3"). Clampeado em [0, 3] por segurança.
 */
export function recallsDone(schedule: RecallScheduleResponse): number {
  return Math.min(3, Math.max(0, schedule.index));
}

/**
 * Resumo curto do histórico de confiança A/B/C registrado nesta sessão (a API
 * não expõe o log de recalls; só temos as marcações feitas aqui). Conta cada
 * letra; vazio → null. Usado pelo painel direito ("o que você sabe menos").
 */
export interface ConfidenceSummary {
  A: number;
  B: number;
  C: number;
  total: number;
}

export function confidenceSummary(
  confidences: RecallConfidenceInput[],
): ConfidenceSummary | null {
  if (confidences.length === 0) return null;
  const summary: ConfidenceSummary = { A: 0, B: 0, C: 0, total: 0 };
  for (const c of confidences) {
    summary[c] += 1;
    summary.total += 1;
  }
  return summary;
}
