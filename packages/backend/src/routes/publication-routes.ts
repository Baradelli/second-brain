import {
  createPublicationSchema,
  editPublicationSchema,
  listPublicationsQuerySchema,
  type PublicationResponse,
  publicationResponseSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  InvalidPublicationError,
  PublicationNotArchivedError,
  PublicationNotFoundError,
} from '../domain/errors.js';
import type { Publication } from '../domain/publication.js';
import { PrismaPublicationRepository } from '../repositories/prisma-publication-repository.js';
import { ArchivePublication } from '../usecases/archive-publication.js';
import { CreatePublication } from '../usecases/create-publication.js';
import { DeletePublication } from '../usecases/delete-publication.js';
import { EditPublication } from '../usecases/edit-publication.js';
import { ListPublications } from '../usecases/list-publications.js';
import { UnarchivePublication } from '../usecases/unarchive-publication.js';

function toResponse(p: Publication): PublicationResponse {
  return {
    id: p.id,
    userId: p.userId,
    sourceType: p.sourceType,
    sourceId: p.sourceId,
    format: p.format,
    stage: p.stage,
    title: p.title,
    noteId: p.noteId,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    status: p.status,
    archivedAt: p.archivedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    labelIds: p.labelIds,
  };
}

export const publicationRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const repo = new PrismaPublicationRepository(options.prisma);
  const createPublication = new CreatePublication(repo);
  const editPublication = new EditPublication(repo);
  const listPublications = new ListPublications(repo);
  const archivePublication = new ArchivePublication(repo);
  const unarchivePublication = new UnarchivePublication(repo);
  const deletePublication = new DeletePublication(repo);

  app.post(
    '/publications',
    {
      schema: {
        body: createPublicationSchema.omit({ userId: true }),
        response: {
          201: publicationResponseSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const publication = await createPublication.execute({
          ...req.body,
          userId: req.user.sub,
        });
        return reply.status(201).send(toResponse(publication));
      } catch (error) {
        if (error instanceof InvalidPublicationError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/publications/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        response: {
          200: publicationResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const publication = await repo.byId(req.params.id);
      if (!publication || publication.userId !== req.user.sub) {
        return reply.status(404).send({ error: 'Publication not found' });
      }
      return toResponse(publication);
    },
  );

  app.get(
    '/publications',
    {
      schema: {
        querystring: listPublicationsQuerySchema.omit({ userId: true }),
        response: { 200: z.array(publicationResponseSchema) },
      },
    },
    async (req) => {
      const publications = await listPublications.execute({
        ...req.query,
        userId: req.user.sub,
      });
      return publications.map(toResponse);
    },
  );

  app.patch(
    '/publications/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: editPublicationSchema.omit({ userId: true }),
        response: {
          200: publicationResponseSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const publication = await editPublication.execute({
          id: req.params.id,
          ...req.body,
          userId: req.user.sub,
        });
        return toResponse(publication);
      } catch (error) {
        if (error instanceof PublicationNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidPublicationError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/publications/:id/archive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        response: {
          200: publicationResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const publication = await archivePublication.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(publication);
      } catch (error) {
        if (error instanceof PublicationNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/publications/:id/unarchive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: publicationResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const publication = await unarchivePublication.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(publication);
      } catch (error) {
        if (error instanceof PublicationNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/publications/:id/delete',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: publicationResponseSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const publication = await deletePublication.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(publication);
      } catch (error) {
        if (error instanceof PublicationNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof PublicationNotArchivedError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
