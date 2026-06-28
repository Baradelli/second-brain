import type {
  GoalProgressResponse,
  GoalResponse,
  GoalTypeInput,
} from '@cerebro/shared';

/**
 * Lógica pura de exibição/ações de objetivos. Sem React aqui — só funções puras
 * testáveis com Vitest, espelhando a semântica do mobile (GoalsPage): que ações
 * cabem por tipo, como derivar a cadência e como ler o progresso CALCULADO pelo
 * backend (`getGoalProgress`). O progresso NUNCA é recalculado aqui — só
 * formatado a partir do `GoalProgressResponse` que o servidor entrega.
 */

/** Título visível de um objetivo: o título, ou um fallback se estiver vazio. */
export function goalLabel(
  goal: Pick<GoalResponse, 'title'>,
  fallback: string,
): string {
  return goal.title.trim() || fallback;
}

/**
 * Percentual de progresso (0–100, inteiro, clampeado) a partir do `ratio`
 * calculado pelo backend. `ratio` nulo (ex.: TARGET sem meta) vira 0. Espelha o
 * `Math.round(ratio * 100)` que o mobile passa ao `ProgressRing`.
 */
export function goalProgressPercent(
  progress: Pick<GoalProgressResponse, 'ratio'> | undefined,
): number {
  const ratio = progress?.ratio ?? 0;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

/**
 * Quais ações cabem por tipo de objetivo — derivado da semântica do mobile:
 * - UMBRELLA: só `complete` (não se faz check diário; reúne filhos).
 * - HABIT: `check` (e desmarca via `undoCheck` quando já feito hoje) + `skip`.
 * - TARGET/PROJECT: `check` com valor + `skip`.
 * Todos podem ser arquivados/desarquivados (tratado fora daqui).
 */
export interface GoalActions {
  /** Marca progresso de hoje (HABIT sem valor; TARGET/PROJECT com valor). */
  check: boolean;
  /** TARGET/PROJECT pedem um valor numérico ao marcar. */
  checkNeedsValue: boolean;
  /** Pode desmarcar o check de hoje (só HABIT, quando feito hoje). */
  canUndo: boolean;
  /** "Não fiz porque…" — registra um skip com motivo (não cabe em UMBRELLA). */
  skip: boolean;
  /** Conclui o objetivo de vez (só UMBRELLA tem o botão dedicado). */
  complete: boolean;
}

export function goalActions(type: GoalTypeInput): GoalActions {
  switch (type) {
    case 'UMBRELLA':
      return {
        check: false,
        checkNeedsValue: false,
        canUndo: false,
        skip: false,
        complete: true,
      };
    case 'HABIT':
      return {
        check: true,
        checkNeedsValue: false,
        canUndo: true,
        skip: true,
        complete: false,
      };
    case 'TARGET':
    case 'PROJECT':
      return {
        check: true,
        checkNeedsValue: true,
        canUndo: false,
        skip: true,
        complete: false,
      };
  }
}

/** Forma estruturada da cadência, para a tela formatar (i18n/weekday narrow). */
export type CadenceDescriptor =
  | { kind: 'weekdays'; weekdays: number[] }
  | {
      kind: 'period';
      period: NonNullable<GoalResponse['period']>;
      times: number | null;
    }
  | { kind: 'target'; targetValue: number | null; unit: string | null }
  | { kind: 'none' };

/**
 * Deriva a cadência/medida de um objetivo a partir dos seus campos — espelha a
 * leitura do mobile (GoalForm decide entre weekdays e period; TARGET/PROJECT
 * usam targetValue+unit). Retorna uma forma estruturada; a tela traduz.
 */
export function cadenceDescriptor(
  goal: Pick<
    GoalResponse,
    'type' | 'weekdays' | 'period' | 'timesPerPeriod' | 'targetValue' | 'unit'
  >,
): CadenceDescriptor {
  if (goal.type === 'HABIT') {
    if (goal.weekdays.length > 0) {
      return {
        kind: 'weekdays',
        weekdays: [...goal.weekdays].sort((a, b) => a - b),
      };
    }
    if (goal.period) {
      return {
        kind: 'period',
        period: goal.period,
        times: goal.timesPerPeriod,
      };
    }
    return { kind: 'none' };
  }
  if (goal.type === 'TARGET' || goal.type === 'PROJECT') {
    return { kind: 'target', targetValue: goal.targetValue, unit: goal.unit };
  }
  return { kind: 'none' };
}
