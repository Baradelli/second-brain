import type { NoteResponse } from '@cerebro/shared';
import { createNoteSchema, listNotesQuerySchema, noteResponseSchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Note } from '../domain/note.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { CreateNote } from '../usecases/create-note.js';

function toResponse(note: Note): NoteResponse {
  return {
    id: note.id,
    userId: note.userId,
    type: note.type,
    scope: note.scope,
    date: note.date.toISOString(),
    title: note.title,
    doc: note.doc as Record<string, unknown>,
    plainText: note.plainText,
    goalId: note.goalId,
    resourceId: note.resourceId,
    eventId: note.eventId,
    labelIds: note.labelIds,
    status: note.status,
    archivedAt: note.archivedAt?.toISOString(),
    createdAt: note.createdAt.toISOString(),
  };
}

export const noteRoutes: FastifyPluginAsyncZod<{ prisma: PrismaClient }> = async (app, options) => {
  const repo = new PrismaNoteRepository(options.prisma);
  const createNote = new CreateNote(repo);

  app.post(
    '/notes',
    {
      schema: {
        body: createNoteSchema,
        response: { 201: noteResponseSchema },
      },
    },
    async (req, reply) => {
      const note = await createNote.execute(req.body);
      return reply.status(201).send(toResponse(note));
    },
  );

  app.get(
    '/notes',
    {
      schema: {
        querystring: listNotesQuerySchema,
        response: { 200: z.array(noteResponseSchema) },
      },
    },
    async (req) => {
      const notes = await repo.find(req.query);
      return notes.map(toResponse);
    },
  );
};
