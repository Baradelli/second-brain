import {
  createStudyItemSchema,
  editStudyItemSchema,
  listStudyItemsQuerySchema,
  logRecallSchema,
  type RecallResponse,
  recallResponseSchema,
  type StudyItemResponse,
  studyItemResponseSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  InvalidRecallError,
  InvalidStudyItemError,
  RecallNotFoundError,
  StudyItemHasHistoryError,
  StudyItemNotArchivedError,
  StudyItemNotFoundError,
} from '../domain/errors.js';
import type { Recall } from '../domain/recall.js';
import { computeRecallSchedule } from '../domain/recall-schedule.js';
import type { StudyItem } from '../domain/study-item.js';
import { PrismaRecallRepository } from '../repositories/prisma-recall-repository.js';
import { PrismaSettingsReader } from '../repositories/prisma-settings-reader.js';
import { PrismaStudyItemRepository } from '../repositories/prisma-study-item-repository.js';
import { ArchiveStudyItem } from '../usecases/archive-study-item.js';
import { CreateStudyItem } from '../usecases/create-study-item.js';
import { DeleteStudyItem } from '../usecases/delete-study-item.js';
import { EditStudyItem } from '../usecases/edit-study-item.js';
import { ListStudyItems } from '../usecases/list-study-items.js';
import { LogRecall } from '../usecases/log-recall.js';
import type { RecallRepository } from '../usecases/ports/recall-repository.js';
import type { SettingsReader } from '../usecases/ports/settings-reader.js';
import { UnarchiveStudyItem } from '../usecases/unarchive-study-item.js';
import { UndoRecall } from '../usecases/undo-recall.js';

const DEFAULT_TIMEZONE = 'UTC';

function recallToResponse(r: Recall): RecallResponse {
  return {
    id: r.id,
    userId: r.userId,
    studyItemId: r.studyItemId,
    confidence: r.confidence,
    note: r.note,
    occurredAt: r.occurredAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  };
}

export const studyItemRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const itemRepo = new PrismaStudyItemRepository(options.prisma);
  const recallRepo: RecallRepository = new PrismaRecallRepository(
    options.prisma,
  );
  const settings: SettingsReader = new PrismaSettingsReader(options.prisma);

  const createStudyItem = new CreateStudyItem(itemRepo);
  const editStudyItem = new EditStudyItem(itemRepo);
  const archiveStudyItem = new ArchiveStudyItem(itemRepo);
  const unarchiveStudyItem = new UnarchiveStudyItem(itemRepo);
  const deleteStudyItem = new DeleteStudyItem(itemRepo, recallRepo);
  const listStudyItems = new ListStudyItems(itemRepo);
  const logRecall = new LogRecall(itemRepo, recallRepo);
  const undoRecall = new UndoRecall(recallRepo);

  // Calcula o agendamento (próxima revisão / devida hoje) de um item a partir dos
  // seus recalls + timezone do dono. Embute no response para a UI não fazer chamada extra.
  async function buildSchedule(
    item: StudyItem,
    timezone: string,
    reference: Date,
  ) {
    const recalls = await recallRepo.find({
      userId: item.userId,
      studyItemId: item.id,
    });
    const s = computeRecallSchedule({
      createdAt: item.createdAt,
      recalls,
      timezone,
      reference,
    });
    return {
      index: s.index,
      consolidated: s.consolidated,
      nextRecallAt: s.nextRecallAt?.toISOString() ?? null,
      dueToday: s.dueToday,
      overdue: s.overdue,
    };
  }

  async function toResponse(
    item: StudyItem,
    userId: string,
  ): Promise<StudyItemResponse> {
    const tz =
      (await settings.getByUserId(userId))?.timezone ?? DEFAULT_TIMEZONE;
    const schedule = await buildSchedule(item, tz, new Date());
    return {
      id: item.id,
      userId: item.userId,
      resourceId: item.resourceId,
      title: item.title,
      reference: item.reference,
      questions: item.questions,
      fichamentoNoteId: item.fichamentoNoteId,
      status: item.status,
      archivedAt: item.archivedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      labelIds: item.labelIds,
      schedule,
    };
  }

  app.post(
    '/study-items',
    {
      schema: {
        body: createStudyItemSchema.omit({ userId: true }),
        response: {
          201: studyItemResponseSchema,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const item = await createStudyItem.execute({
          ...req.body,
          userId: req.user.sub,
        });
        return reply.status(201).send(await toResponse(item, req.user.sub));
      } catch (error) {
        if (error instanceof InvalidStudyItemError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/study-items',
    {
      schema: {
        querystring: listStudyItemsQuerySchema.omit({ userId: true }),
        response: { 200: z.array(studyItemResponseSchema) },
      },
    },
    async (req) => {
      const items = await listStudyItems.execute({
        ...req.query,
        userId: req.user.sub,
      });
      return Promise.all(items.map((i) => toResponse(i, req.user.sub)));
    },
  );

  app.get(
    '/study-items/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        response: {
          200: studyItemResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const item = await itemRepo.byId(req.params.id);
      if (!item || item.userId !== req.user.sub) {
        return reply.status(404).send({ error: 'StudyItem not found' });
      }
      return toResponse(item, req.user.sub);
    },
  );

  app.patch(
    '/study-items/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: editStudyItemSchema.omit({ userId: true }),
        response: {
          200: studyItemResponseSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const item = await editStudyItem.execute({
          id: req.params.id,
          ...req.body,
          userId: req.user.sub,
        });
        return await toResponse(item, req.user.sub);
      } catch (error) {
        if (error instanceof StudyItemNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidStudyItemError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/study-items/:id/archive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        response: {
          200: studyItemResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const item = await archiveStudyItem.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return await toResponse(item, req.user.sub);
      } catch (error) {
        if (error instanceof StudyItemNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/study-items/:id/unarchive',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: studyItemResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const item = await unarchiveStudyItem.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return await toResponse(item, req.user.sub);
      } catch (error) {
        if (error instanceof StudyItemNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/study-items/:id/delete',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: z.object({}),
        response: {
          200: studyItemResponseSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const item = await deleteStudyItem.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return await toResponse(item, req.user.sub);
      } catch (error) {
        if (error instanceof StudyItemNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (
          error instanceof StudyItemNotArchivedError ||
          error instanceof StudyItemHasHistoryError
        ) {
          return reply.status(409).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/study-items/:id/recalls',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: logRecallSchema.omit({ userId: true }),
        response: {
          201: recallResponseSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const recall = await logRecall.execute({
          studyItemId: req.params.id,
          ...req.body,
          userId: req.user.sub,
        });
        return reply.status(201).send(recallToResponse(recall));
      } catch (error) {
        if (error instanceof StudyItemNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        if (error instanceof InvalidRecallError) {
          return reply.status(400).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.delete(
    '/recalls/:id',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        response: {
          204: z.null(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        await undoRecall.execute({
          recallId: req.params.id,
          userId: req.user.sub,
        });
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof RecallNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
