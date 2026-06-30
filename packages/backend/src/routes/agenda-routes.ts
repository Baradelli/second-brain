import type {
  CaptureResponse,
  GoalResponse,
  NoteResponse,
  ResourceResponse,
} from '@cerebro/shared';
import {
  captureResponseSchema,
  goalResponseSchema,
  noteResponseSchema,
  promoteCaptureSchema,
  resourceResponseSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Capture } from '../domain/capture.js';
import {
  CaptureHasReferencesError,
  CaptureNotArchivedError,
  CaptureNotFoundError,
} from '../domain/errors.js';
import type { Goal } from '../domain/goal.js';
import type { Note } from '../domain/note.js';
import type { Resource } from '../domain/resource.js';
import { PrismaAttachmentRepository } from '../repositories/prisma-attachment-repository.js';
import { PrismaCaptureRepository } from '../repositories/prisma-capture-repository.js';
import { PrismaEventRepository } from '../repositories/prisma-event-repository.js';
import { PrismaGoalRepository } from '../repositories/prisma-goal-repository.js';
import { PrismaNoteLinkRepository } from '../repositories/prisma-note-link-repository.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { PrismaRecallRepository } from '../repositories/prisma-recall-repository.js';
import { PrismaResourceRepository } from '../repositories/prisma-resource-repository.js';
import { PrismaSettingsReader } from '../repositories/prisma-settings-reader.js';
import { PrismaStudyItemRepository } from '../repositories/prisma-study-item-repository.js';
import { ArchiveCapture } from '../usecases/archive-capture.js';
import { BuildTodayAgenda } from '../usecases/build-today-agenda.js';
import { CreateGoal } from '../usecases/create-goal.js';
import { CreateNote } from '../usecases/create-note.js';
import { CreateResource } from '../usecases/create-resource.js';
import { DeleteCapture } from '../usecases/delete-capture.js';
import { FindNoteOfTheDay } from '../usecases/find-note-of-the-day.js';
import { ListPendingCaptures } from '../usecases/list-pending-captures.js';
import { PromoteCaptureToGoal } from '../usecases/promote-capture-to-goal.js';
import { PromoteCaptureToNote } from '../usecases/promote-capture-to-note.js';
import { PromoteCaptureToResource } from '../usecases/promote-capture-to-resource.js';
import { SelectDueRecalls } from '../usecases/select-due-recalls.js';
import { SelectTodaysGoals } from '../usecases/select-todays-goals.js';
import { UnarchiveCapture } from '../usecases/unarchive-capture.js';

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
    labelIds: n.labelIds,
    status: n.status,
    archivedAt: n.archivedAt?.toISOString(),
    createdAt: n.createdAt.toISOString(),
  };
}

const agendaQuerySchema = z.object({
  day: z.enum(['today']).default('today'),
});

const journalEntrySchema = z.object({
  done: z.boolean(),
  noteId: z.string().optional(),
});

const agendaGoalSchema = z.object({
  goalId: z.string(),
  title: z.string(),
  kind: z.enum(['scheduled', 'invitation']),
  resolvedToday: z.boolean(),
});

const agendaRecallSchema = z.object({
  studyItemId: z.string(),
  title: z.string(),
  dueToday: z.boolean(),
  overdue: z.boolean(),
  nextRecallAt: z.string().datetime().nullable(),
});

const todayAgendaResponseSchema = z.object({
  date: z.string(),
  journal: z.object({
    devotional: journalEntrySchema,
    reflection: journalEntrySchema,
  }),
  capturesToReview: z.array(captureResponseSchema),
  goals: z.array(agendaGoalSchema),
  recallsDue: z.array(agendaRecallSchema),
});

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

function goalToResponse(g: Goal): GoalResponse {
  return {
    id: g.id,
    userId: g.userId,
    title: g.title,
    description: g.description,
    type: g.type,
    parentId: g.parentId,
    targetValue: g.targetValue,
    unit: g.unit,
    period: g.period,
    timesPerPeriod: g.timesPerPeriod,
    weekdays: g.weekdays,
    startAt: g.startAt?.toISOString() ?? null,
    dueAt: g.dueAt?.toISOString() ?? null,
    completedAt: g.completedAt?.toISOString() ?? null,
    status: g.status,
    archivedAt: g.archivedAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
    labelIds: g.labelIds,
  };
}

const archiveBodySchema = z.object({
  reason: z.string().optional(),
});

const promoteResponseSchema = z.union([
  z.object({ note: noteResponseSchema, capture: captureResponseSchema }),
  z.object({
    resource: resourceResponseSchema,
    capture: captureResponseSchema,
  }),
  z.object({ goal: goalResponseSchema, capture: captureResponseSchema }),
]);

export const agendaRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const noteRepo = new PrismaNoteRepository(options.prisma);
  const captureRepo = new PrismaCaptureRepository(options.prisma);
  const settingsReader = new PrismaSettingsReader(options.prisma);
  const resourceRepo = new PrismaResourceRepository(options.prisma);
  const goalRepo = new PrismaGoalRepository(options.prisma);
  const eventRepo = new PrismaEventRepository(options.prisma);
  const studyItemRepo = new PrismaStudyItemRepository(options.prisma);
  const recallRepo = new PrismaRecallRepository(options.prisma);

  const buildTodayAgenda = new BuildTodayAgenda(
    settingsReader,
    new FindNoteOfTheDay(noteRepo),
    new ListPendingCaptures(captureRepo),
    new SelectTodaysGoals(goalRepo, eventRepo),
    new SelectDueRecalls(studyItemRepo, recallRepo),
  );
  const archiveCapture = new ArchiveCapture(captureRepo);
  const unarchiveCapture = new UnarchiveCapture(captureRepo);
  const deleteCapture = new DeleteCapture(
    captureRepo,
    new PrismaAttachmentRepository(options.prisma),
  );
  const promoteCaptureToNote = new PromoteCaptureToNote(
    captureRepo,
    new CreateNote(noteRepo, new PrismaNoteLinkRepository(options.prisma)),
  );
  const promoteCaptureToResource = new PromoteCaptureToResource(
    captureRepo,
    new CreateResource(resourceRepo),
  );
  const promoteCaptureToGoal = new PromoteCaptureToGoal(
    captureRepo,
    new CreateGoal(goalRepo),
  );

  app.get(
    '/agenda',
    {
      schema: {
        querystring: agendaQuerySchema,
        response: { 200: todayAgendaResponseSchema },
      },
    },
    async (req) => {
      const agenda = await buildTodayAgenda.execute({
        userId: req.user.sub,
        reference: new Date(),
      });
      return {
        ...agenda,
        capturesToReview: agenda.capturesToReview.map(captureToResponse),
        recallsDue: agenda.recallsDue.map((r) => ({
          ...r,
          nextRecallAt: r.nextRecallAt?.toISOString() ?? null,
        })),
      };
    },
  );

  app.post(
    '/captures/:id/archive',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: archiveBodySchema,
        response: { 200: captureResponseSchema },
      },
    },
    async (req, reply) => {
      const capture = await archiveCapture.execute({
        id: req.params.id,
        reason: req.body.reason,
      });
      return reply.status(200).send(captureToResponse(capture));
    },
  );

  app.post(
    '/captures/:id/unarchive',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({}),
        response: {
          200: captureResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const capture = await unarchiveCapture.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return reply.status(200).send(captureToResponse(capture));
      } catch (err) {
        if (err instanceof CaptureNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.post(
    '/captures/:id/delete',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({}),
        response: {
          200: captureResponseSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const capture = await deleteCapture.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return reply.status(200).send(captureToResponse(capture));
      } catch (err) {
        if (err instanceof CaptureNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        if (
          err instanceof CaptureNotArchivedError ||
          err instanceof CaptureHasReferencesError
        ) {
          return reply.status(409).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.post(
    '/captures/:id/promote',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: promoteCaptureSchema,
        response: { 201: promoteResponseSchema },
      },
    },
    async (req, reply) => {
      const captureId = req.params.id;
      const body = req.body;

      if (body.destination === 'resource') {
        const { resource, capture } = await promoteCaptureToResource.execute({
          captureId,
          title: body.title,
          type: body.type,
          url: body.url,
          author: body.author,
          description: body.description,
        });
        return reply.status(201).send({
          resource: resourceToResponse(resource),
          capture: captureToResponse(capture),
        });
      }

      if (body.destination === 'goal') {
        const { goal, capture } = await promoteCaptureToGoal.execute({
          captureId,
          title: body.title,
          type: body.type,
          description: body.description,
          targetValue: body.targetValue,
          unit: body.unit,
          period: body.period,
          timesPerPeriod: body.timesPerPeriod,
          weekdays: body.weekdays,
          startAt: body.startAt,
          dueAt: body.dueAt,
          parentId: body.parentId,
        });
        return reply.status(201).send({
          goal: goalToResponse(goal),
          capture: captureToResponse(capture),
        });
      }

      // destination === 'note' — timezone do dono da captura (não mais hardcoded).
      const existing = await captureRepo.byId(captureId);
      const timezone = existing
        ? ((await settingsReader.getByUserId(existing.userId))?.timezone ??
          'UTC')
        : 'UTC';
      const { note, capture } = await promoteCaptureToNote.execute({
        captureId,
        type: body.type,
        scope: body.scope,
        title: body.title,
        reference: new Date(),
        timezone,
      });
      return reply.status(201).send({
        note: noteToResponse(note),
        capture: captureToResponse(capture),
      });
    },
  );
};
