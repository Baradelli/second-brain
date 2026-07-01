import {
  archivedGoalSchema,
  archiveGoalSchema,
  completeGoalSchema,
  createGoalSchema,
  editGoalSchema,
  type GoalResponse,
  goalResponseSchema,
  listGoalsQuerySchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  GoalHasActiveChildrenError,
  GoalHasChildrenError,
  GoalHasDoneHistoryError,
  GoalNotArchivedError,
  GoalNotFoundError,
  InvalidGoalError,
} from '../domain/errors.js';
import type { Goal } from '../domain/goal.js';
import { PrismaEventRepository } from '../repositories/prisma-event-repository.js';
import { PrismaGoalRepository } from '../repositories/prisma-goal-repository.js';
import { PrismaResourceRepository } from '../repositories/prisma-resource-repository.js';
import { ArchiveGoal } from '../usecases/archive-goal.js';
import { CompleteGoal } from '../usecases/complete-goal.js';
import { CreateGoal } from '../usecases/create-goal.js';
import { DeleteGoal } from '../usecases/delete-goal.js';
import { EditGoal } from '../usecases/edit-goal.js';
import { ListActiveGoals } from '../usecases/list-active-goals.js';
import { ListArchivedGoals } from '../usecases/list-archived-goals.js';
import { UnarchiveGoal } from '../usecases/unarchive-goal.js';

function toResponse(g: Goal): GoalResponse {
  return {
    id: g.id,
    userId: g.userId,
    title: g.title,
    description: g.description,
    type: g.type,
    parentId: g.parentId,
    resourceId: g.resourceId ?? null,
    targetValue: g.targetValue,
    unit: g.unit,
    period: g.period,
    timesPerPeriod: g.timesPerPeriod,
    weekdays: g.weekdays,
    startAt: g.startAt?.toISOString() ?? null,
    dueAt: g.dueAt?.toISOString() ?? null,
    completedAt: g.completedAt?.toISOString() ?? null,
    status: g.status,
    archivedAt: g.archivedAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
    labelIds: g.labelIds,
  };
}

export const goalRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const repo = new PrismaGoalRepository(options.prisma);
  const eventRepo = new PrismaEventRepository(options.prisma);
  const resourceRepo = new PrismaResourceRepository(options.prisma);
  const createGoal = new CreateGoal(repo, resourceRepo);
  const editGoal = new EditGoal(repo, resourceRepo);
  const listActiveGoals = new ListActiveGoals(repo);
  const completeGoal = new CompleteGoal(repo);
  const archiveGoal = new ArchiveGoal(repo);
  const unarchiveGoal = new UnarchiveGoal(repo);
  const deleteGoal = new DeleteGoal(repo, eventRepo);
  const listArchivedGoals = new ListArchivedGoals(repo, eventRepo);

  app.post(
    '/goals',
    {
      schema: {
        body: createGoalSchema.omit({ userId: true }),
        response: {
          201: goalResponseSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const goal = await createGoal.execute({
          ...req.body,
          userId: req.user.sub,
        });
        return reply.status(201).send(toResponse(goal));
      } catch (error) {
        // parent inexistente/inválido também é erro de input → 400
        if (
          error instanceof InvalidGoalError ||
          error instanceof GoalNotFoundError
        ) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/goals',
    {
      schema: {
        querystring: listGoalsQuerySchema.omit({ userId: true }),
        response: { 200: z.array(goalResponseSchema) },
      },
    },
    async (req) => {
      const goals = await listActiveGoals.execute({
        ...req.query,
        userId: req.user.sub,
      });
      return goals.map(toResponse);
    },
  );

  app.get(
    '/goals/archived',
    {
      schema: {
        querystring: z.object({}),
        response: { 200: z.array(archivedGoalSchema) },
      },
    },
    async (req) => {
      const items = await listArchivedGoals.execute({
        userId: req.user.sub,
      });
      return items.map(({ goal, deletable }) => ({
        ...toResponse(goal),
        deletable,
      }));
    },
  );

  app.patch(
    '/goals/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: editGoalSchema.omit({ userId: true }),
        response: {
          200: goalResponseSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const goal = await editGoal.execute({
          id: req.params.id,
          ...req.body,
          userId: req.user.sub,
        });
        return toResponse(goal);
      } catch (error) {
        if (error instanceof GoalNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidGoalError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/goals/:id/complete',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: completeGoalSchema.omit({ userId: true }),
        response: {
          200: goalResponseSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const goal = await completeGoal.execute({
          id: req.params.id,
          ...req.body,
          userId: req.user.sub,
        });
        return toResponse(goal);
      } catch (error) {
        if (error instanceof GoalNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidGoalError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/goals/:id/archive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: archiveGoalSchema.omit({ userId: true }),
        response: {
          200: goalResponseSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const goal = await archiveGoal.execute({
          id: req.params.id,
          ...req.body,
          userId: req.user.sub,
        });
        return toResponse(goal);
      } catch (error) {
        if (error instanceof GoalNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof GoalHasActiveChildrenError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/goals/:id/unarchive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: goalResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const goal = await unarchiveGoal.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(goal);
      } catch (error) {
        if (error instanceof GoalNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/goals/:id/delete',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: goalResponseSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const goal = await deleteGoal.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(goal);
      } catch (error) {
        if (error instanceof GoalNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (
          error instanceof GoalNotArchivedError ||
          error instanceof GoalHasChildrenError ||
          error instanceof GoalHasDoneHistoryError
        ) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
