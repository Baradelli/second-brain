import { beforeEach, describe, expect, it } from 'vitest';

import type { Capture } from '../../domain/capture.js';
import {
  CaptureAlreadyProcessedError,
  CaptureNotFoundError,
  InvalidGoalError,
} from '../../domain/errors.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { CreateGoal } from '../create-goal.js';
import { PromoteCaptureToGoal } from '../promote-capture-to-goal.js';

const USER = 'user-1';

function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: 'cap-1',
    userId: USER,
    text: 'Treinar 3x por semana',
    status: 'PENDING',
    reviewAt: null,
    processedAt: null,
    promotedToType: null,
    promotedToId: null,
    archivedAt: null,
    archiveReason: null,
    labelIds: ['l1'],
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PromoteCaptureToGoal', () => {
  let captures: CaptureRepositoryFake;
  let goals: GoalRepositoryFake;
  let useCase: PromoteCaptureToGoal;

  beforeEach(() => {
    captures = new CaptureRepositoryFake();
    goals = new GoalRepositoryFake();
    useCase = new PromoteCaptureToGoal(captures, new CreateGoal(goals));
  });

  it('creates a HABIT goal (title=text, inherits labels) and marks capture PROCESSED', async () => {
    await captures.save(makeCapture());

    const { goal, capture } = await useCase.execute({
      userId: USER,
      captureId: 'cap-1',
      type: 'HABIT',
      weekdays: [1, 3, 5],
    });

    expect(goal.title).toBe('Treinar 3x por semana');
    expect(goal.type).toBe('HABIT');
    expect(goal.weekdays).toEqual([1, 3, 5]);
    expect(goal.labelIds).toEqual(['l1']);

    expect(capture.status).toBe('PROCESSED');
    expect(capture.promotedToType).toBe('goal');
    expect(capture.promotedToId).toBe(goal.id);
  });

  it('propagates CreateGoal validation errors (HABIT without cadence)', async () => {
    await captures.save(makeCapture());
    await expect(
      useCase.execute({ userId: USER, captureId: 'cap-1', type: 'HABIT' }),
    ).rejects.toThrow(InvalidGoalError);

    // capture stays PENDING (not consumed) since creation failed
    const persisted = await captures.byId('cap-1');
    expect(persisted?.status).toBe('PENDING');
  });

  it('throws for unknown capture / already processed', async () => {
    await expect(
      useCase.execute({ userId: USER, captureId: 'ghost', type: 'TARGET', targetValue: 1 }),
    ).rejects.toThrow(CaptureNotFoundError);

    await captures.save(makeCapture({ status: 'PROCESSED' }));
    await expect(
      useCase.execute({ userId: USER, captureId: 'cap-1', type: 'TARGET', targetValue: 1 }),
    ).rejects.toThrow(CaptureAlreadyProcessedError);
  });
});
