import {
  checkGoalSchema,
  type EventResponse,
  eventResponseSchema,
  type GoalProgressResponse,
  goalProgressResponseSchema,
  skipGoalSchema,
  undoCheckSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  EventNotFoundError,
  GoalNotFoundError,
  InvalidCheckError,
} from '../domain/errors.js';
import type { Event } from '../domain/event.js';
import { PrismaEventRepository } from '../repositories/prisma-event-repository.js';
import { PrismaGoalRepository } from '../repositories/prisma-goal-repository.js';
import { PrismaSettingsReader } from '../repositories/prisma-settings-reader.js';
import { CheckGoal } from '../usecases/check-goal.js';
import {
  ComputeGoalProgress,
  type GoalProgress,
} from '../usecases/compute-goal-progress.js';
import { SkipGoal } from '../usecases/skip-goal.js';
import { UndoCheck } from '../usecases/undo-check.js';

function toResponse(e: Event): EventResponse {
  return {
    id: e.id,
    userId: e.userId,
    goalId: e.goalId,
    type: e.type,
    value: e.value,
    reason: e.reason,
    occurredAt: e.occurredAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
  };
}

function toProgress(p: GoalProgress): GoalProgressResponse {
  return {
    goalId: p.goalId,
    type: p.type,
    done: p.done,
    target: p.target,
    ratio: p.ratio,
    period: p.period
      ? { from: p.period.from.toISOString(), to: p.period.to.toISOString() }
      : null,
    completed: p.completed,
    children: p.children?.map(toProgress),
  };
}

export const eventRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const events = new PrismaEventRepository(options.prisma);
  const goals = new PrismaGoalRepository(options.prisma);
  const settings = new PrismaSettingsReader(options.prisma);
  const checkGoal = new CheckGoal(goals, events);
  const skipGoal = new SkipGoal(goals, events);
  const undoCheck = new UndoCheck(events);
  const computeProgress = new ComputeGoalProgress(goals, events, settings);

  app.post(
    '/goals/:id/check',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: checkGoalSchema,
        response: {
          201: eventResponseSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const event = await checkGoal.execute({
          goalId: req.params.id,
          ...req.body,
        });
        return reply.status(201).send(toResponse(event));
      } catch (error) {
        if (error instanceof GoalNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidCheckError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/goals/:id/skip',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: skipGoalSchema,
        response: {
          201: eventResponseSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const event = await skipGoal.execute({
          goalId: req.params.id,
          ...req.body,
        });
        return reply.status(201).send(toResponse(event));
      } catch (error) {
        if (error instanceof GoalNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidCheckError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.delete(
    '/events/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: undoCheckSchema,
        response: {
          204: z.null(),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        await undoCheck.execute({
          eventId: req.params.id,
          userId: req.body.userId,
        });
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof EventNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidCheckError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/goals/:id/progress',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        querystring: z.object({
          userId: z.string().min(1),
          reference: z.coerce.date().optional(),
        }),
        response: {
          200: goalProgressResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const progress = await computeProgress.execute({
          goalId: req.params.id,
          userId: req.query.userId,
          reference: req.query.reference,
        });
        return toProgress(progress);
      } catch (error) {
        if (error instanceof GoalNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
