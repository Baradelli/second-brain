import { InvalidGoalError } from './errors.js';
import { GOAL_PERIODS, type GoalPeriod, type GoalType } from './goal.js';

/**
 * Estado de cadência/medida de um Goal, suficiente para validar a coerência por tipo.
 * Usado tanto no createGoal (estado novo) quanto no editGoal (estado atual + patch).
 */
export interface GoalCadenceMeasureState {
  type: GoalType;
  weekdays: number[];
  period: GoalPeriod | null;
  timesPerPeriod: number | null;
  targetValue: number | null;
  unit: string | null;
}

/**
 * Regras inegociáveis do Goal (CLAUDE.md / Tarefa 29), num só lugar:
 * - cadência só em HABIT, mutuamente exclusiva (weekdays XOR period+timesPerPeriod);
 * - medida (targetValue/unit) só em TARGET/PROJECT.
 * Lança InvalidGoalError na primeira violação.
 */
export function validateGoalCadenceAndMeasure(
  g: GoalCadenceMeasureState,
): void {
  const hasWeekdays = g.weekdays.length > 0;
  const hasPeriod = g.period != null || g.timesPerPeriod != null;

  if (g.type === 'HABIT') {
    if (hasWeekdays && hasPeriod) {
      throw new InvalidGoalError(
        'HABIT must use exactly one cadence: weekdays OR period+timesPerPeriod',
      );
    }
    if (!hasWeekdays && !hasPeriod) {
      throw new InvalidGoalError('HABIT requires a cadence');
    }
    if (hasWeekdays) {
      for (const d of g.weekdays) {
        if (!Number.isInteger(d) || d < 0 || d > 6) {
          throw new InvalidGoalError(`weekday out of range 0..6: ${d}`);
        }
      }
      if (new Set(g.weekdays).size !== g.weekdays.length) {
        throw new InvalidGoalError('weekdays must not repeat');
      }
    }
    if (hasPeriod) {
      if (g.period == null || g.timesPerPeriod == null) {
        throw new InvalidGoalError(
          'period and timesPerPeriod must be provided together',
        );
      }
      if (!GOAL_PERIODS.includes(g.period)) {
        throw new InvalidGoalError(`unknown period '${g.period}'`);
      }
      if (!Number.isInteger(g.timesPerPeriod) || g.timesPerPeriod < 1) {
        throw new InvalidGoalError('timesPerPeriod must be an integer >= 1');
      }
    }
  } else if (hasWeekdays || hasPeriod) {
    throw new InvalidGoalError(
      `cadence is only valid for HABIT, not ${g.type}`,
    );
  }

  const isMeasurable = g.type === 'TARGET' || g.type === 'PROJECT';
  if (!isMeasurable) {
    if (g.targetValue != null || g.unit != null) {
      throw new InvalidGoalError(
        `targetValue/unit are only valid for TARGET/PROJECT, not ${g.type}`,
      );
    }
  } else if (g.targetValue != null && !(g.targetValue > 0)) {
    throw new InvalidGoalError('targetValue must be > 0');
  }
}
