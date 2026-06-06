import { calendarMonthResponseSchema, calendarQuerySchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { PrismaEventRepository } from '../repositories/prisma-event-repository.js';
import { PrismaGoalRepository } from '../repositories/prisma-goal-repository.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { PrismaSettingsReader } from '../repositories/prisma-settings-reader.js';
import { BuildMonthCalendar } from '../usecases/build-month-calendar.js';

export const calendarRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const buildMonthCalendar = new BuildMonthCalendar(
    new PrismaGoalRepository(options.prisma),
    new PrismaEventRepository(options.prisma),
    new PrismaNoteRepository(options.prisma),
    new PrismaSettingsReader(options.prisma),
  );

  app.get(
    '/calendar',
    {
      schema: {
        querystring: calendarQuerySchema,
        response: { 200: calendarMonthResponseSchema },
      },
    },
    async (req) => {
      return buildMonthCalendar.execute({
        userId: req.query.userId,
        month: req.query.month,
      });
    },
  );
};
