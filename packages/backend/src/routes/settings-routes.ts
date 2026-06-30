import {
  addHighlightColorSchema,
  editHighlightColorSchema,
  highlightColorSchema,
  settingsResponseSchema,
  updateSettingsSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  HighlightColorInUseError,
  HighlightColorNotFoundError,
  InvalidHighlightError,
} from '../domain/errors.js';
import type { Settings } from '../domain/settings.js';
import { PrismaHighlightRepository } from '../repositories/prisma-highlight-repository.js';
import { PrismaSettingsRepository } from '../repositories/prisma-settings-repository.js';
import { AddHighlightColor } from '../usecases/add-highlight-color.js';
import { EditHighlightColor } from '../usecases/edit-highlight-color.js';
import { GetSettings } from '../usecases/get-settings.js';
import { ListHighlightColors } from '../usecases/list-highlight-colors.js';
import { RemoveHighlightColor } from '../usecases/remove-highlight-color.js';
import { UpdateSettings } from '../usecases/update-settings.js';

function toResponse(s: Settings) {
  return {
    reviewWeekday: s.reviewWeekday,
    recapWeekday: s.recapWeekday,
    timezone: s.timezone,
    devotionalTime: s.devotionalTime,
    reflectionTime: s.reflectionTime,
    aiMode: s.aiMode,
  };
}

export const settingsRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const repo = new PrismaSettingsRepository(options.prisma);
  const highlights = new PrismaHighlightRepository(options.prisma);
  const getSettings = new GetSettings(repo);
  const updateSettings = new UpdateSettings(repo);
  const listColors = new ListHighlightColors(repo);
  const addColor = new AddHighlightColor(repo);
  const editColor = new EditHighlightColor(repo);
  const removeColor = new RemoveHighlightColor(repo, highlights);

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

  // ── Paleta de grifos ────────────────────────────────────────────────────────

  app.get(
    '/settings/highlight-colors',
    { schema: { response: { 200: z.array(highlightColorSchema) } } },
    async (req) => {
      return listColors.execute({ userId: req.user.sub });
    },
  );

  app.post(
    '/settings/highlight-colors',
    {
      schema: {
        body: addHighlightColorSchema,
        response: {
          201: highlightColorSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const color = await addColor.execute({
          userId: req.user.sub,
          ...req.body,
        });
        return reply.status(201).send(color);
      } catch (error) {
        if (error instanceof InvalidHighlightError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.patch(
    '/settings/highlight-colors/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: editHighlightColorSchema,
        response: {
          200: highlightColorSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const color = await editColor.execute({
          userId: req.user.sub,
          id: req.params.id,
          ...req.body,
        });
        return color;
      } catch (error) {
        if (error instanceof HighlightColorNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidHighlightError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.delete(
    '/settings/highlight-colors/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        response: {
          204: z.null(),
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string(), count: z.number() }),
        },
      },
    },
    async (req, reply) => {
      try {
        await removeColor.execute({ userId: req.user.sub, id: req.params.id });
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof HighlightColorNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof HighlightColorInUseError) {
          return reply
            .status(409)
            .send({ error: error.message, count: error.count });
        }
        throw error;
      }
    },
  );
};
