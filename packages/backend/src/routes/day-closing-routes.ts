import { dayClosingResponseSchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { PrismaEventRepository } from '../repositories/prisma-event-repository.js';
import { PrismaGoalRepository } from '../repositories/prisma-goal-repository.js';
import { PrismaSettingsReader } from '../repositories/prisma-settings-reader.js';
import { BuildDayClosing } from '../usecases/build-day-closing.js';

export const dayClosingRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const buildDayClosing = new BuildDayClosing(
    new PrismaGoalRepository(options.prisma),
    new PrismaEventRepository(options.prisma),
    new PrismaSettingsReader(options.prisma),
  );

  app.get(
    '/day-closing',
    {
      schema: {
        querystring: z.object({
          userId: z.string().min(1),
          day: z.enum(['today']).default('today'),
        }),
        response: { 200: dayClosingResponseSchema },
      },
    },
    async (req) => {
      return buildDayClosing.execute({
        userId: req.query.userId,
        reference: new Date(),
      });
    },
  );
};
