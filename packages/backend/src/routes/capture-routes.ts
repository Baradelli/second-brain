import {
  type CaptureResponse,
  captureResponseSchema,
  createCaptureSchema,
  listCapturesQuerySchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Capture } from '../domain/capture.js';
import { PrismaCaptureRepository } from '../repositories/prisma-capture-repository.js';
import { PrismaSettingsReader } from '../repositories/prisma-settings-reader.js';
import { CreateCapture } from '../usecases/create-capture.js';
import { ListArchived } from '../usecases/list-archived.js';
import { ListPendingCaptures } from '../usecases/list-pending-captures.js';

function toResponse(c: Capture): CaptureResponse {
  return {
    id: c.id,
    userId: c.userId,
    text: c.text,
    url: c.url,
    status: c.status,
    reviewAt: c.reviewAt?.toISOString() ?? null,
    processedAt: c.processedAt?.toISOString() ?? null,
    promotedToType: c.promotedToType,
    promotedToId: c.promotedToId,
    archivedAt: c.archivedAt?.toISOString() ?? null,
    archiveReason: c.archiveReason,
    labelIds: c.labelIds,
    createdAt: c.createdAt.toISOString(),
  };
}

export const captureRoutes: FastifyPluginAsyncZod<{ prisma: PrismaClient }> = async (app, options) => {
  const repo = new PrismaCaptureRepository(options.prisma);
  const settingsReader = new PrismaSettingsReader(options.prisma);
  const createCapture = new CreateCapture(repo, settingsReader);
  const listPending = new ListPendingCaptures(repo);
  const listArchived = new ListArchived(repo);

  app.post(
    '/captures',
    {
      schema: {
        body: createCaptureSchema,
        response: { 201: captureResponseSchema },
      },
    },
    async (req, reply) => {
      const capture = await createCapture.execute(req.body);
      return reply.status(201).send(toResponse(capture));
    },
  );

  app.get(
    '/captures',
    {
      schema: {
        querystring: listCapturesQuerySchema,
        response: { 200: z.array(captureResponseSchema) },
      },
    },
    async (req) => {
      const { userId, status } = req.query;

      if (status === 'ARCHIVED') {
        const captures = await listArchived.execute({ userId });
        return captures.map(toResponse);
      }

      const userSettings = await settingsReader.getByUserId(userId);
      const timezone = userSettings?.timezone ?? 'America/Sao_Paulo';

      const captures = await listPending.execute({
        userId,
        reference: new Date(),
        timezone,
      });
      return captures.map(toResponse);
    },
  );
};
