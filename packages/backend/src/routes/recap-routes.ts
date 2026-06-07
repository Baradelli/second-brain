import type { NoteResponse } from '@cerebro/shared';
import { createRecapSchema, noteResponseSchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Note } from '../domain/note.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { PrismaSettingsReader } from '../repositories/prisma-settings-reader.js';
import { CreateNote } from '../usecases/create-note.js';
import { EditNote } from '../usecases/edit-note.js';
import { FindNoteOfTheDay } from '../usecases/find-note-of-the-day.js';
import { UpsertJournalNote } from '../usecases/upsert-journal-note.js';
import { UpsertRecap } from '../usecases/upsert-recap.js';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
const EMPTY_DOC = { type: 'doc', content: [] };

function toResponse(n: Note): NoteResponse {
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

export const recapRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const noteRepo = new PrismaNoteRepository(options.prisma);
  const settings = new PrismaSettingsReader(options.prisma);
  const upsertRecap = new UpsertRecap(
    new UpsertJournalNote(
      new FindNoteOfTheDay(noteRepo),
      new CreateNote(noteRepo),
      new EditNote(noteRepo),
    ),
  );

  app.post(
    '/recaps',
    {
      schema: {
        body: createRecapSchema,
        response: { 200: noteResponseSchema },
      },
    },
    async (req) => {
      const userSettings = await settings.getByUserId(req.body.userId);
      const { note } = await upsertRecap.execute({
        userId: req.body.userId,
        type: req.body.type,
        scope: req.body.scope,
        reference: new Date(),
        timezone: userSettings?.timezone ?? DEFAULT_TIMEZONE,
        recapWeekday: userSettings?.reviewWeekday ?? 1,
        doc: EMPTY_DOC,
        mode: 'create-or-get',
      });
      return toResponse(note);
    },
  );
};
