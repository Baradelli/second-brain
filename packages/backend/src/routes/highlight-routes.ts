import {
  createHighlightSchema,
  editHighlightSchema,
  type HighlightResponse,
  highlightResponseSchema,
  listHighlightsQuerySchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  HighlightColorNotFoundError,
  HighlightNotArchivedError,
  HighlightNotFoundError,
  InvalidHighlightError,
} from '../domain/errors.js';
import type { Highlight } from '../domain/highlight.js';
import { PrismaHighlightRepository } from '../repositories/prisma-highlight-repository.js';
import { PrismaSettingsRepository } from '../repositories/prisma-settings-repository.js';
import { ArchiveHighlight } from '../usecases/archive-highlight.js';
import { CreateHighlight } from '../usecases/create-highlight.js';
import { DeleteHighlight } from '../usecases/delete-highlight.js';
import { EditHighlight } from '../usecases/edit-highlight.js';
import { ListHighlights } from '../usecases/list-highlights.js';
import { UnarchiveHighlight } from '../usecases/unarchive-highlight.js';

function toResponse(h: Highlight): HighlightResponse {
  return {
    id: h.id,
    userId: h.userId,
    resourceId: h.resourceId,
    colorId: h.colorId,
    location: h.location,
    quote: h.quote,
    comment: h.comment,
    status: h.status,
    archivedAt: h.archivedAt?.toISOString() ?? null,
    createdAt: h.createdAt.toISOString(),
  };
}

export const highlightRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const repo = new PrismaHighlightRepository(options.prisma);
  const settings = new PrismaSettingsRepository(options.prisma);
  const createHighlight = new CreateHighlight(repo, settings);
  const editHighlight = new EditHighlight(repo, settings);
  const listHighlights = new ListHighlights(repo);
  const archiveHighlight = new ArchiveHighlight(repo);
  const unarchiveHighlight = new UnarchiveHighlight(repo);
  const deleteHighlight = new DeleteHighlight(repo);

  app.post(
    '/highlights',
    {
      schema: {
        body: createHighlightSchema.omit({ userId: true }),
        response: {
          201: highlightResponseSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const highlight = await createHighlight.execute({
          ...req.body,
          userId: req.user.sub,
        });
        return reply.status(201).send(toResponse(highlight));
      } catch (error) {
        if (
          error instanceof InvalidHighlightError ||
          error instanceof HighlightColorNotFoundError
        ) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/highlights',
    {
      schema: {
        querystring: listHighlightsQuerySchema.omit({ userId: true }),
        response: { 200: z.array(highlightResponseSchema) },
      },
    },
    async (req) => {
      const highlights = await listHighlights.execute({
        ...req.query,
        userId: req.user.sub,
      });
      return highlights.map(toResponse);
    },
  );

  app.get(
    '/highlights/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        response: {
          200: highlightResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const highlight = await repo.byId(req.params.id);
      if (!highlight || highlight.userId !== req.user.sub) {
        return reply.status(404).send({ error: 'Highlight not found' });
      }
      return toResponse(highlight);
    },
  );

  app.patch(
    '/highlights/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: editHighlightSchema.omit({ userId: true }),
        response: {
          200: highlightResponseSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const highlight = await editHighlight.execute({
          id: req.params.id,
          ...req.body,
          userId: req.user.sub,
        });
        return toResponse(highlight);
      } catch (error) {
        if (error instanceof HighlightNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (
          error instanceof InvalidHighlightError ||
          error instanceof HighlightColorNotFoundError
        ) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/highlights/:id/archive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: highlightResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const highlight = await archiveHighlight.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(highlight);
      } catch (error) {
        if (error instanceof HighlightNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/highlights/:id/unarchive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: highlightResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const highlight = await unarchiveHighlight.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(highlight);
      } catch (error) {
        if (error instanceof HighlightNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/highlights/:id/delete',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: highlightResponseSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const highlight = await deleteHighlight.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(highlight);
      } catch (error) {
        if (error instanceof HighlightNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof HighlightNotArchivedError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
