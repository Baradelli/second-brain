import {
  calendarDayDetailResponseSchema,
  calendarDayQuerySchema,
  calendarMonthResponseSchema,
  calendarQuerySchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { PrismaEventRepository } from '../repositories/prisma-event-repository.js';
import { PrismaGoalRepository } from '../repositories/prisma-goal-repository.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { PrismaSettingsReader } from '../repositories/prisma-settings-reader.js';
import { BuildDayDetail } from '../usecases/build-day-detail.js';
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
  const buildDayDetail = new BuildDayDetail(
    new PrismaGoalRepository(options.prisma),
    new PrismaEventRepository(options.prisma),
    new PrismaNoteRepository(options.prisma),
    new PrismaSettingsReader(options.prisma),
  );

  app.get(
    '/calendar',
    {
      schema: {
        querystring: calendarQuerySchema.omit({ userId: true }),
        response: { 200: calendarMonthResponseSchema },
      },
    },
    async (req) => {
      return buildMonthCalendar.execute({
        userId: req.user.sub,
        month: req.query.month,
      });
    },
  );

  app.get(
    '/calendar/day',
    {
      schema: {
        querystring: calendarDayQuerySchema.omit({ userId: true }),
        response: { 200: calendarDayDetailResponseSchema },
      },
    },
    async (req) => {
      return buildDayDetail.execute({
        userId: req.user.sub,
        date: req.query.date,
      });
    },
  );
};
