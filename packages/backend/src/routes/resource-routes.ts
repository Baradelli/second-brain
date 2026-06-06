import {
  createResourceSchema,
  editResourceSchema,
  listResourcesQuerySchema,
  type ResourceResponse,
  resourceResponseSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  InvalidResourceError,
  ResourceNotFoundError,
} from '../domain/errors.js';
import type { Resource } from '../domain/resource.js';
import { PrismaResourceRepository } from '../repositories/prisma-resource-repository.js';
import { CreateResource } from '../usecases/create-resource.js';
import { EditResource } from '../usecases/edit-resource.js';
import { ListResources } from '../usecases/list-resources.js';

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

export const resourceRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const repo = new PrismaResourceRepository(options.prisma);
  const createResource = new CreateResource(repo);
  const editResource = new EditResource(repo);
  const listResources = new ListResources(repo);

  app.post(
    '/resources',
    {
      schema: {
        body: createResourceSchema,
        response: {
          201: resourceResponseSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const resource = await createResource.execute(req.body);
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
        querystring: z.object({ userId: z.string().min(1) }),
        response: {
          200: resourceResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const resource = await repo.byId(req.params.id);
      if (!resource || resource.userId !== req.query.userId) {
        return reply.status(404).send({ error: 'Resource not found' });
      }
      return toResponse(resource);
    },
  );

  app.get(
    '/resources',
    {
      schema: {
        querystring: listResourcesQuerySchema,
        response: { 200: z.array(resourceResponseSchema) },
      },
    },
    async (req) => {
      const resources = await listResources.execute(req.query);
      return resources.map(toResponse);
    },
  );

  app.patch(
    '/resources/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: editResourceSchema,
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
};
