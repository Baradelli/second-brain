import { settingsResponseSchema, updateSettingsSchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Settings } from '../domain/settings.js';
import { PrismaSettingsRepository } from '../repositories/prisma-settings-repository.js';
import { GetSettings } from '../usecases/get-settings.js';
import { UpdateSettings } from '../usecases/update-settings.js';

function toResponse(s: Settings) {
  return {
    reviewWeekday: s.reviewWeekday,
    recapWeekday: s.recapWeekday,
    timezone: s.timezone,
    devotionalTime: s.devotionalTime,
    reflectionTime: s.reflectionTime,
  };
}

export const settingsRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const repo = new PrismaSettingsRepository(options.prisma);
  const getSettings = new GetSettings(repo);
  const updateSettings = new UpdateSettings(repo);

  app.get(
    '/settings',
    { schema: { response: { 200: settingsResponseSchema } } },
    async (req) => {
      const settings = await getSettings.execute({ userId: req.user.sub });
      return toResponse(settings);
    },
  );

  app.patch(
    '/settings',
    {
      schema: {
        body: updateSettingsSchema,
        response: { 200: settingsResponseSchema },
      },
    },
    async (req) => {
      const settings = await updateSettings.execute({
        userId: req.user.sub,
        patch: req.body,
      });
      return toResponse(settings);
    },
  );
};
