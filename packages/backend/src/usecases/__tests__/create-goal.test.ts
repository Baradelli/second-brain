import { beforeEach, describe, expect, it } from 'vitest';

import { InvalidGoalError } from '../../domain/errors.js';
import type { Goal } from '../../domain/goal.js';
import type { Resource } from '../../domain/resource.js';
import { GoalRepositoryFake } from '../_fakes/goal-repository-fake.js';
import { ResourceRepositoryFake } from '../_fakes/resource-repository-fake.js';
import { CreateGoal } from '../create-goal.js';

const USER = 'user-1';

async function seedResource(
  repo: ResourceRepositoryFake,
  overrides?: Partial<Resource>,
): Promise<Resource> {
  const resource: Resource = {
    id: 'res-1',
    userId: USER,
    title: 'Confissões',
    type: 'book',
    url: null,
    author: null,
    description: null,
    stage: 'backlog',
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
  await repo.save(resource);
  return resource;
}

async function seedUmbrella(
  repo: GoalRepositoryFake,
  overrides?: Partial<Goal>,
): Promise<Goal> {
  const umbrella: Goal = {
    id: 'umb-1',
    userId: USER,
    title: 'Saúde',
    description: null,
    type: 'UMBRELLA',
    parentId: null,
    targetValue: null,
    unit: null,
    period: null,
    timesPerPeriod: null,
    weekdays: [],
    startAt: null,
    dueAt: null,
    completedAt: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
  await repo.save(umbrella);
  return umbrella;
}

describe('CreateGoal', () => {
  let repo: GoalRepositoryFake;
  let resources: ResourceRepositoryFake;
  let useCase: CreateGoal;

  beforeEach(() => {
    repo = new GoalRepositoryFake();
    resources = new ResourceRepositoryFake();
    useCase = new CreateGoal(repo, resources);
  });

  describe('basics & defaults', () => {
    it('creates a HABIT with weekdays and correct defaults, persisting it', async () => {
      const result = await useCase.execute({
        userId: USER,
        title: '  Ler  ',
        type: 'HABIT',
        weekdays: [1, 3, 5],
      });

      expect(result.id).toBeTruthy();
      expect(result.title).toBe('Ler');
      expect(result.type).toBe('HABIT');
      expect(result.weekdays).toEqual([1, 3, 5]);
      expect(result.period).toBeNull();
      expect(result.timesPerPeriod).toBeNull();
      expect(result.status).toBe('ACTIVE');
      expect(result.completedAt).toBeNull();
      expect(result.archivedAt).toBeNull();
      expect(result.parentId).toBeNull();
      expect(result.labelIds).toEqual([]);
      expect(result.description).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);

      expect(repo.saved).toHaveLength(1);
    });

    it('creates a HABIT with period + timesPerPeriod', async () => {
      const result = await useCase.execute({
        userId: USER,
        title: 'Treinar',
        type: 'HABIT',
        period: 'week',
        timesPerPeriod: 3,
      });

      expect(result.period).toBe('week');
      expect(result.timesPerPeriod).toBe(3);
      expect(result.weekdays).toEqual([]);
    });

    it('rejects unknown type', async () => {
      await expect(
        // @ts-expect-error testing defensive validation
        useCase.execute({ userId: USER, title: 'x', type: 'NOPE' }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects empty / whitespace title', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: '   ',
          type: 'HABIT',
          weekdays: [1],
        }),
      ).rejects.toThrow(InvalidGoalError);
    });
  });

  describe('HABIT cadence exclusivity', () => {
    it('rejects HABIT with both cadence forms', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'HABIT',
          weekdays: [1],
          period: 'week',
          timesPerPeriod: 2,
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects HABIT with no cadence at all', async () => {
      await expect(
        useCase.execute({ userId: USER, title: 'x', type: 'HABIT' }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects weekday out of range 0..6', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'HABIT',
          weekdays: [7],
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects repeated weekdays', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'HABIT',
          weekdays: [1, 1],
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects period without timesPerPeriod (and vice-versa)', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'HABIT',
          period: 'week',
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects timesPerPeriod < 1', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'HABIT',
          period: 'day',
          timesPerPeriod: 0,
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects cadence on a non-HABIT goal', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'TARGET',
          targetValue: 10,
          weekdays: [1],
        }),
      ).rejects.toThrow(InvalidGoalError);
    });
  });

  describe('measure (targetValue/unit) only on TARGET/PROJECT', () => {
    it('creates a TARGET with targetValue + unit', async () => {
      const result = await useCase.execute({
        userId: USER,
        title: 'Correr 100km',
        type: 'TARGET',
        targetValue: 100,
        unit: 'km',
      });
      expect(result.targetValue).toBe(100);
      expect(result.unit).toBe('km');
    });

    it('creates a PROJECT (targetValue optional)', async () => {
      const result = await useCase.execute({
        userId: USER,
        title: 'Lançar app',
        type: 'PROJECT',
      });
      expect(result.type).toBe('PROJECT');
      expect(result.targetValue).toBeNull();
    });

    it('rejects targetValue <= 0', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'TARGET',
          targetValue: 0,
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects targetValue/unit on HABIT or UMBRELLA', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'HABIT',
          weekdays: [1],
          targetValue: 5,
        }),
      ).rejects.toThrow(InvalidGoalError);
    });
  });

  describe('parentId — child of UMBRELLA only', () => {
    it('creates a child whose parent is a valid UMBRELLA', async () => {
      const umbrella = await seedUmbrella(repo);
      const result = await useCase.execute({
        userId: USER,
        title: 'Correr',
        type: 'TARGET',
        targetValue: 50,
        parentId: umbrella.id,
      });
      expect(result.parentId).toBe(umbrella.id);
    });

    it('rejects when parent does not exist', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'TARGET',
          targetValue: 1,
          parentId: 'ghost',
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects when parent belongs to another user', async () => {
      await seedUmbrella(repo, { id: 'umb-other', userId: 'other' });
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'TARGET',
          targetValue: 1,
          parentId: 'umb-other',
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects when parent is not an UMBRELLA', async () => {
      await seedUmbrella(repo, { id: 'not-umb', type: 'PROJECT' });
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'TARGET',
          targetValue: 1,
          parentId: 'not-umb',
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects an UMBRELLA with a parentId (no nesting)', async () => {
      const umbrella = await seedUmbrella(repo);
      await expect(
        useCase.execute({
          userId: USER,
          title: 'Sub-guarda-chuva',
          type: 'UMBRELLA',
          parentId: umbrella.id,
        }),
      ).rejects.toThrow(InvalidGoalError);
    });
  });

  describe('resourceId — objetivo de leitura', () => {
    it('links a goal to a resource the user owns', async () => {
      const resource = await seedResource(resources);
      const result = await useCase.execute({
        userId: USER,
        title: 'Ler Confissões',
        type: 'PROJECT',
        targetValue: 350,
        unit: 'páginas',
        resourceId: resource.id,
      });
      expect(result.resourceId).toBe(resource.id);
    });

    it('defaults resourceId to null when omitted', async () => {
      const result = await useCase.execute({
        userId: USER,
        title: 'Meditar',
        type: 'HABIT',
        weekdays: [1],
      });
      expect(result.resourceId).toBeNull();
    });

    it('rejects a resourceId that does not exist', async () => {
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'PROJECT',
          resourceId: 'ghost',
        }),
      ).rejects.toThrow(InvalidGoalError);
    });

    it('rejects a resource owned by another user', async () => {
      await seedResource(resources, { id: 'res-other', userId: 'other' });
      await expect(
        useCase.execute({
          userId: USER,
          title: 'x',
          type: 'PROJECT',
          resourceId: 'res-other',
        }),
      ).rejects.toThrow(InvalidGoalError);
    });
  });
});
