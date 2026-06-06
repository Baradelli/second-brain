import type { Goal } from '../domain/goal.js';
import type { EventRepository } from './ports/event-repository.js';
import type { GoalRepository } from './ports/goal-repository.js';

export interface ListArchivedGoalsInput {
  userId: string;
}

export interface ArchivedGoalItem {
  goal: Goal;
  deletable: boolean; // sem nenhum evento `done` → pode ser excluído de vez
}

/** Lista objetivos arquivados (mais recentes primeiro) com a flag `deletable`. */
export class ListArchivedGoals {
  constructor(
    private goals: GoalRepository,
    private events: EventRepository,
  ) {}

  async execute(input: ListArchivedGoalsInput): Promise<ArchivedGoalItem[]> {
    const archived = await this.goals.find({
      userId: input.userId,
      status: 'ARCHIVED',
    });

    const doneEvents = await this.events.find({
      userId: input.userId,
      type: 'done',
    });
    const goalsWithDone = new Set(doneEvents.map((e) => e.goalId));

    return archived
      .sort(
        (a, b) =>
          (b.archivedAt?.getTime() ?? 0) - (a.archivedAt?.getTime() ?? 0),
      )
      .map((goal) => ({ goal, deletable: !goalsWithDone.has(goal.id) }));
  }
}
