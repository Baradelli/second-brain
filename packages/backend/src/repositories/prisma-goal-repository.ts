import type { Goal as PrismaGoal, Label, PrismaClient } from '@prisma/client';

import type { Goal } from '../domain/goal.js';
import type {
  GoalFilter,
  GoalRepository,
} from '../usecases/ports/goal-repository.js';

type GoalWithLabels = PrismaGoal & { labels: Pick<Label, 'id'>[] };

const INCLUDE_LABELS = { labels: { select: { id: true } } } as const;

function toDomain(record: GoalWithLabels): Goal {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    description: record.description ?? null,
    type: record.type as Goal['type'],
    parentId: record.parentId ?? null,
    resourceId: record.resourceId ?? null,
    targetValue: record.targetValue ?? null,
    unit: record.unit ?? null,
    period: (record.period ?? null) as Goal['period'],
    timesPerPeriod: record.timesPerPeriod ?? null,
    weekdays: record.weekdays,
    startAt: record.startAt ?? null,
    dueAt: record.dueAt ?? null,
    completedAt: record.completedAt ?? null,
    status: record.status as Goal['status'],
    archivedAt: record.archivedAt ?? null,
    createdAt: record.createdAt,
    labelIds: record.labels.map((label) => label.id),
  };
}

export class PrismaGoalRepository implements GoalRepository {
  constructor(private prisma: PrismaClient) {}

  async save(goal: Goal): Promise<Goal> {
    const record = await this.prisma.goal.create({
      data: {
        id: goal.id,
        userId: goal.userId,
        title: goal.title,
        description: goal.description,
        type: goal.type,
        parentId: goal.parentId,
        resourceId: goal.resourceId ?? null,
        targetValue: goal.targetValue,
        unit: goal.unit,
        period: goal.period,
        timesPerPeriod: goal.timesPerPeriod,
        weekdays: goal.weekdays,
        startAt: goal.startAt,
        dueAt: goal.dueAt,
        completedAt: goal.completedAt,
        status: goal.status,
        archivedAt: goal.archivedAt,
        createdAt: goal.createdAt,
        ...(goal.labelIds.length
          ? { labels: { connect: goal.labelIds.map((id) => ({ id })) } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return toDomain(record);
  }

  async byId(id: string): Promise<Goal | null> {
    const record = await this.prisma.goal.findUnique({
      where: { id },
      include: INCLUDE_LABELS,
    });
    return record ? toDomain(record) : null;
  }

  async find(filter: GoalFilter): Promise<Goal[]> {
    const records = await this.prisma.goal.findMany({
      where: {
        userId: filter.userId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.type ? { type: filter.type } : {}),
        ...(filter.parentId !== undefined ? { parentId: filter.parentId } : {}),
        ...(filter.resourceId !== undefined
          ? { resourceId: filter.resourceId }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return records.map(toDomain);
  }

  async update(id: string, patch: Partial<Goal>): Promise<Goal> {
    const exists = await this.prisma.goal.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new Error(`Goal not found: ${id}`);

    const { labelIds, ...rest } = patch;

    const record = await this.prisma.goal.update({
      where: { id },
      data: {
        ...(rest.title !== undefined ? { title: rest.title } : {}),
        ...(rest.description !== undefined
          ? { description: rest.description }
          : {}),
        ...(rest.parentId !== undefined ? { parentId: rest.parentId } : {}),
        ...(rest.resourceId !== undefined
          ? { resourceId: rest.resourceId }
          : {}),
        ...(rest.targetValue !== undefined
          ? { targetValue: rest.targetValue }
          : {}),
        ...(rest.unit !== undefined ? { unit: rest.unit } : {}),
        ...(rest.period !== undefined ? { period: rest.period } : {}),
        ...(rest.timesPerPeriod !== undefined
          ? { timesPerPeriod: rest.timesPerPeriod }
          : {}),
        ...(rest.weekdays !== undefined ? { weekdays: rest.weekdays } : {}),
        ...(rest.startAt !== undefined ? { startAt: rest.startAt } : {}),
        ...(rest.dueAt !== undefined ? { dueAt: rest.dueAt } : {}),
        ...(rest.completedAt !== undefined
          ? { completedAt: rest.completedAt }
          : {}),
        ...(rest.status !== undefined ? { status: rest.status } : {}),
        ...(rest.archivedAt !== undefined
          ? { archivedAt: rest.archivedAt }
          : {}),
        ...(labelIds !== undefined
          ? { labels: { set: labelIds.map((lid) => ({ id: lid })) } }
          : {}),
      },
      include: INCLUDE_LABELS,
    });
    return toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.goal.delete({ where: { id } });
  }
}
