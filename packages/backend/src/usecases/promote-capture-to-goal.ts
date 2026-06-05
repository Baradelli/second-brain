import type { Capture } from '../domain/capture.js';
import type { Goal, GoalPeriod, GoalType } from '../domain/goal.js';
import { CreateGoal } from './create-goal.js';
import type { CaptureRepository } from './ports/capture-repository.js';
import { loadPendingCapture, markPromoted } from './promote-capture-shared.js';

export interface PromoteCaptureToGoalInput {
  captureId: string;
  title?: string; // default: capture.text (trim)
  type: GoalType;
  description?: string | null;
  targetValue?: number | null;
  unit?: string | null;
  period?: GoalPeriod | null;
  timesPerPeriod?: number | null;
  weekdays?: number[];
  startAt?: Date | null;
  dueAt?: Date | null;
  parentId?: string | null;
}

export class PromoteCaptureToGoal {
  constructor(
    private captureRepo: CaptureRepository,
    private createGoal: CreateGoal,
  ) {}

  async execute(
    input: PromoteCaptureToGoalInput,
  ): Promise<{ goal: Goal; capture: Capture }> {
    const capture = await loadPendingCapture(this.captureRepo, input.captureId);

    const goal = await this.createGoal.execute({
      userId: capture.userId,
      title: input.title?.trim() || capture.text.trim(),
      type: input.type,
      description: input.description,
      targetValue: input.targetValue,
      unit: input.unit,
      period: input.period,
      timesPerPeriod: input.timesPerPeriod,
      weekdays: input.weekdays,
      startAt: input.startAt,
      dueAt: input.dueAt,
      parentId: input.parentId,
      labelIds: capture.labelIds,
    });

    const updatedCapture = await markPromoted(
      this.captureRepo,
      input.captureId,
      'goal',
      goal.id,
    );

    return { goal, capture: updatedCapture };
  }
}
