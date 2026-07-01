import { GoalNotFoundError, InvalidGoalError } from '../domain/errors.js';
import type { Goal, GoalPeriod } from '../domain/goal.js';
import { validateGoalCadenceAndMeasure } from '../domain/goal-rules.js';
import type { GoalRepository } from './ports/goal-repository.js';
import type { ResourceRepository } from './ports/resource-repository.js';

export interface EditGoalInput {
  id: string;
  userId: string; // dono; rejeita editar goal de outro user → GoalNotFoundError (sem vazar)
  title?: string;
  description?: string | null;
  targetValue?: number | null;
  unit?: string | null;
  period?: GoalPeriod | null;
  timesPerPeriod?: number | null;
  weekdays?: number[];
  startAt?: Date | null;
  dueAt?: Date | null;
  resourceId?: string | null; // liga/desliga o objetivo de um Resource
  labelIds?: string[]; // se presente, SUBSTITUI o conjunto
}

// `type`, `parentId`, `status`, `archivedAt` e `completedAt` NÃO são editáveis aqui:
// trocar tipo/pai = recriar; arquivar/completar são UseCases próprios (Tarefa 31).

export class EditGoal {
  constructor(
    private repo: GoalRepository,
    private resources?: ResourceRepository,
  ) {}

  async execute(input: EditGoalInput): Promise<Goal> {
    const existing = await this.repo.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new GoalNotFoundError(input.id);
    }

    // Estado resultante (atual + patch), validado com o tipo ATUAL do goal.
    const resulting = {
      type: existing.type,
      weekdays: input.weekdays ?? existing.weekdays,
      period: input.period !== undefined ? input.period : existing.period,
      timesPerPeriod:
        input.timesPerPeriod !== undefined
          ? input.timesPerPeriod
          : existing.timesPerPeriod,
      targetValue:
        input.targetValue !== undefined
          ? input.targetValue
          : existing.targetValue,
      unit: input.unit !== undefined ? input.unit : existing.unit,
    };
    validateGoalCadenceAndMeasure(resulting);

    const patch: Partial<Goal> = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length === 0) {
        throw new InvalidGoalError('title must not be empty');
      }
      patch.title = title;
    }
    if (input.description !== undefined) patch.description = input.description;
    if (input.targetValue !== undefined) patch.targetValue = input.targetValue;
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.period !== undefined) patch.period = input.period;
    if (input.timesPerPeriod !== undefined)
      patch.timesPerPeriod = input.timesPerPeriod;
    if (input.weekdays !== undefined) patch.weekdays = input.weekdays;
    if (input.startAt !== undefined) patch.startAt = input.startAt;
    if (input.dueAt !== undefined) patch.dueAt = input.dueAt;
    if (input.resourceId !== undefined) {
      if (input.resourceId !== null && this.resources) {
        const resource = await this.resources.byId(input.resourceId);
        if (!resource || resource.userId !== existing.userId) {
          throw new InvalidGoalError(
            'resource must be an existing resource you own',
          );
        }
      }
      patch.resourceId = input.resourceId;
    }
    if (input.labelIds !== undefined) patch.labelIds = input.labelIds;

    return this.repo.update(input.id, patch);
  }
}
