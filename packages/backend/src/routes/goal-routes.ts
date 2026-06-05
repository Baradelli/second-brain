import {
  type GoalResponse,
  createGoalSchema,
  editGoalSchema,
  goalResponseSchema,
  listGoalsQuerySchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { GoalNotFoundError, InvalidGoalError } from '../domain/errors.js';
import type { Goal } from '../domain/goal.js';
import { PrismaGoalRepository } from '../repositories/prisma-goal-repository.js';
import { CreateGoal } from '../usecases/create-goal.js';
import { EditGoal } from '../usecases/edit-goal.js';
import { ListActiveGoals } from '../usecases/list-active-goals.js';

function toResponse(g: Goal): GoalResponse {
  return {
    id: g.id,
    userId: g.userId,
    title: g.title,
    description: g.description,
    type: g.type,
    parentId: g.parentId,
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
  const createGoal = new CreateGoal(repo);
  const editGoal = new EditGoal(repo);
  const listActiveGoals = new ListActiveGoals(repo);

  app.post(
    '/goals',
    {
      schema: {
        body: createGoalSchema,
        response: {
          201: goalResponseSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const goal = await createGoal.execute(req.body);
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
        querystring: listGoalsQuerySchema,
        response: { 200: z.array(goalResponseSchema) },
      },
    },
    async (req) => {
      const goals = await listActiveGoals.execute(req.query);
      return goals.map(toResponse);
    },
  );

  app.patch(
    '/goals/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: editGoalSchema,
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
};
