import {
  archiveLabelSchema,
  createLabelSchema,
  type LabelNodeResponse,
  labelNodeResponseSchema,
  type LabelResponse,
  labelResponseSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  LabelInUseError,
  LabelNotFoundError,
  LabelParentInvalidError,
} from '../domain/errors.js';
import type { Label, LabelNode } from '../domain/label.js';
import { PrismaLabelRepository } from '../repositories/prisma-label-repository.js';
import { ArchiveLabel } from '../usecases/archive-label.js';
import { CreateLabel } from '../usecases/create-label.js';
import { ListLabelTree } from '../usecases/list-label-tree.js';

function toResponse(label: Label): LabelResponse {
  return {
    id: label.id,
    userId: label.userId,
    name: label.name,
    parentId: label.parentId,
    color: label.color,
    status: label.status,
    archivedAt: label.archivedAt?.toISOString() ?? null,
    createdAt: label.createdAt.toISOString(),
  };
}

function toNodeResponse(label: LabelNode): LabelNodeResponse {
  return {
    ...toResponse(label),
    children: label.children.map(toNodeResponse),
  };
}

export const labelRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const repo = new PrismaLabelRepository(options.prisma);
  const createLabel = new CreateLabel(repo);
  const listLabelTree = new ListLabelTree(repo);
  const archiveLabel = new ArchiveLabel(repo);

  app.post(
    '/labels',
    {
      schema: {
        body: createLabelSchema,
        response: {
          201: labelResponseSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const label = await createLabel.execute(req.body);
        return reply.status(201).send(toResponse(label));
      } catch (error) {
        if (error instanceof LabelParentInvalidError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/labels',
    {
      schema: {
        querystring: z.object({ userId: z.string().min(1) }),
        response: { 200: z.array(labelNodeResponseSchema) },
      },
    },
    async (req) => {
      const labels = await listLabelTree.execute({
        userId: req.query.userId,
        status: 'ACTIVE',
      });
      return labels.map(toNodeResponse);
    },
  );

  app.post(
    '/labels/:id/archive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: archiveLabelSchema,
        response: {
          200: labelResponseSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const label = await archiveLabel.execute({ id: req.params.id });
        return toResponse(label);
      } catch (error) {
        if (error instanceof LabelNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof LabelInUseError) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
