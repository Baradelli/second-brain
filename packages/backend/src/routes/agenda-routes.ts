import type { CaptureResponse, NoteResponse } from '@cerebro/shared';
import { captureResponseSchema, noteResponseSchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Capture } from '../domain/capture.js';
import type { Note } from '../domain/note.js';
import { PrismaCaptureRepository } from '../repositories/prisma-capture-repository.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { PrismaSettingsReader } from '../repositories/prisma-settings-reader.js';
import { ArchiveCapture } from '../usecases/archive-capture.js';
import { BuildTodayAgenda } from '../usecases/build-today-agenda.js';
import { CreateNote } from '../usecases/create-note.js';
import { FindNoteOfTheDay } from '../usecases/find-note-of-the-day.js';
import { ListPendingCaptures } from '../usecases/list-pending-captures.js';
import { PromoteCaptureToNote } from '../usecases/promote-capture-to-note.js';

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
  userId: z.string().min(1),
  day: z.enum(['today']).default('today'),
});

const journalEntrySchema = z.object({
  done: z.boolean(),
  noteId: z.string().optional(),
});

const todayAgendaResponseSchema = z.object({
  date: z.string(),
  journal: z.object({
    devotional: journalEntrySchema,
    reflection: journalEntrySchema,
  }),
  capturesToReview: z.array(captureResponseSchema),
});

const archiveBodySchema = z.object({
  reason: z.string().optional(),
});

const promoteBodySchema = z.object({
  type: z.enum(['DEVOTIONAL', 'REFLECTION', 'STUDY_NOTE', 'NOTE']),
  scope: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']).optional(),
  title: z.string().optional(),
});

const promoteResponseSchema = z.object({
  note: noteResponseSchema,
  capture: captureResponseSchema,
});

export const agendaRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const noteRepo = new PrismaNoteRepository(options.prisma);
  const captureRepo = new PrismaCaptureRepository(options.prisma);
  const settingsReader = new PrismaSettingsReader(options.prisma);

  const buildTodayAgenda = new BuildTodayAgenda(
    settingsReader,
    new FindNoteOfTheDay(noteRepo),
    new ListPendingCaptures(captureRepo),
  );
  const archiveCapture = new ArchiveCapture(captureRepo);
  const promoteCaptureToNote = new PromoteCaptureToNote(
    captureRepo,
    new CreateNote(noteRepo),
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
        userId: req.query.userId,
        reference: new Date(),
      });
      return {
        ...agenda,
        capturesToReview: agenda.capturesToReview.map(captureToResponse),
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
    '/captures/:id/promote',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: promoteBodySchema,
        response: { 201: promoteResponseSchema },
      },
    },
    async (req, reply) => {
      const { note, capture } = await promoteCaptureToNote.execute({
        captureId: req.params.id,
        type: req.body.type,
        scope: req.body.scope,
        title: req.body.title,
        reference: new Date(),
        timezone:
          (await settingsReader.getByUserId('owner'))?.timezone ?? 'UTC',
      });
      return reply.status(201).send({
        note: noteToResponse(note),
        capture: captureToResponse(capture),
      });
    },
  );
};
