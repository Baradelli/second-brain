import type {
  CaptureResponse,
  NoteResponse,
  ResourceResponse,
} from '@cerebro/shared';
import { searchQuerySchema, searchResultSchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Capture } from '../domain/capture.js';
import type { Note } from '../domain/note.js';
import type { Resource } from '../domain/resource.js';
import { PrismaCaptureRepository } from '../repositories/prisma-capture-repository.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { PrismaResourceRepository } from '../repositories/prisma-resource-repository.js';
import { SearchAll } from '../usecases/search-all.js';

function noteToResponse(n: Note): NoteResponse {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    scope: n.scope,
    date: n.date.toISOString(),
    title: n.title,
    doc: n.doc as Record<string, unknown>,
    plainText: n.plainText,
    resourceId: n.resourceId,
    labelIds: n.labelIds,
    status: n.status,
    archivedAt: n.archivedAt?.toISOString(),
    createdAt: n.createdAt.toISOString(),
  };
}

function resourceToResponse(r: Resource): ResourceResponse {
  return {
    id: r.id,
    userId: r.userId,
    title: r.title,
    type: r.type,
    url: r.url,
    author: r.author,
    description: r.description,
    stage: r.stage,
    status: r.status,
    archivedAt: r.archivedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    labelIds: r.labelIds,
  };
}

function captureToResponse(c: Capture): CaptureResponse {
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

export const searchRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const searchAll = new SearchAll(
    new PrismaNoteRepository(options.prisma),
    new PrismaResourceRepository(options.prisma),
    new PrismaCaptureRepository(options.prisma),
  );

  app.get(
    '/search',
    {
      schema: {
        querystring: searchQuerySchema.omit({ userId: true }),
        response: { 200: searchResultSchema },
      },
    },
    async (req) => {
      const result = await searchAll.execute({
        userId: req.user.sub,
        query: req.query.q,
      });
      return {
        notes: result.notes.map(noteToResponse),
        resources: result.resources.map(resourceToResponse),
        captures: result.captures.map(captureToResponse),
      };
    },
  );
};
