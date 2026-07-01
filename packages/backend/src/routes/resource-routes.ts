import {
  createResourceSchema,
  editResourceSchema,
  listResourcesQuerySchema,
  type PublicationResponse,
  publicationResponseSchema,
  type ResourceResponse,
  resourceResponseSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  InvalidResourceError,
  ResourceHasReferencesError,
  ResourceNotArchivedError,
  ResourceNotFoundError,
} from '../domain/errors.js';
import type { Publication } from '../domain/publication.js';
import type { Resource } from '../domain/resource.js';
import { PrismaGoalRepository } from '../repositories/prisma-goal-repository.js';
import { PrismaHighlightRepository } from '../repositories/prisma-highlight-repository.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { PrismaPublicationRepository } from '../repositories/prisma-publication-repository.js';
import { PrismaResourceRepository } from '../repositories/prisma-resource-repository.js';
import { PrismaStudyItemRepository } from '../repositories/prisma-study-item-repository.js';
import { ArchiveResource } from '../usecases/archive-resource.js';
import { CreateResource } from '../usecases/create-resource.js';
import { DeleteResource } from '../usecases/delete-resource.js';
import { EditResource } from '../usecases/edit-resource.js';
import { ListResourcePublications } from '../usecases/list-resource-publications.js';
import { ListResources } from '../usecases/list-resources.js';
import { UnarchiveResource } from '../usecases/unarchive-resource.js';

function toResponse(r: Resource): ResourceResponse {
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

function toPublicationResponse(p: Publication): PublicationResponse {
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

export const resourceRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const repo = new PrismaResourceRepository(options.prisma);
  const createResource = new CreateResource(repo);
  const editResource = new EditResource(repo);
  const listResources = new ListResources(repo);
  const archiveResource = new ArchiveResource(repo);
  const unarchiveResource = new UnarchiveResource(repo);
  const deleteResource = new DeleteResource(
    repo,
    new PrismaNoteRepository(options.prisma),
    new PrismaStudyItemRepository(options.prisma),
    new PrismaHighlightRepository(options.prisma),
    new PrismaGoalRepository(options.prisma),
  );
  const listResourcePublications = new ListResourcePublications(
    new PrismaPublicationRepository(options.prisma),
    new PrismaStudyItemRepository(options.prisma),
    new PrismaNoteRepository(options.prisma),
  );

  app.post(
    '/resources',
    {
      schema: {
        body: createResourceSchema.omit({ userId: true }),
        response: {
          201: resourceResponseSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const resource = await createResource.execute({
          ...req.body,
          userId: req.user.sub,
        });
        return reply.status(201).send(toResponse(resource));
      } catch (error) {
        if (error instanceof InvalidResourceError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/resources/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        response: {
          200: resourceResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const resource = await repo.byId(req.params.id);
      if (!resource || resource.userId !== req.user.sub) {
        return reply.status(404).send({ error: 'Resource not found' });
      }
      return toResponse(resource);
    },
  );

  // Publicações que nasceram deste recurso (diretas + de itens de estudo/notas).
  app.get(
    '/resources/:id/publications',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        response: { 200: z.array(publicationResponseSchema) },
      },
    },
    async (req) => {
      const items = await listResourcePublications.execute({
        userId: req.user.sub,
        resourceId: req.params.id,
      });
      return items.map(toPublicationResponse);
    },
  );

  app.get(
    '/resources',
    {
      schema: {
        querystring: listResourcesQuerySchema.omit({ userId: true }),
        response: { 200: z.array(resourceResponseSchema) },
      },
    },
    async (req) => {
      const resources = await listResources.execute({
        ...req.query,
        userId: req.user.sub,
      });
      return resources.map(toResponse);
    },
  );

  app.patch(
    '/resources/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: editResourceSchema.omit({ userId: true }),
        response: {
          200: resourceResponseSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const resource = await editResource.execute({
          id: req.params.id,
          ...req.body,
          userId: req.user.sub,
        });
        return toResponse(resource);
      } catch (error) {
        if (error instanceof ResourceNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidResourceError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/resources/:id/archive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: resourceResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const resource = await archiveResource.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(resource);
      } catch (error) {
        if (error instanceof ResourceNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/resources/:id/unarchive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: resourceResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const resource = await unarchiveResource.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(resource);
      } catch (error) {
        if (error instanceof ResourceNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/resources/:id/delete',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: resourceResponseSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const resource = await deleteResource.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return toResponse(resource);
      } catch (error) {
        if (error instanceof ResourceNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (
          error instanceof ResourceNotArchivedError ||
          error instanceof ResourceHasReferencesError
        ) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
