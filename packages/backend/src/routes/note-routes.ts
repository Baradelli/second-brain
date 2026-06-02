import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { createNoteSchema, listNotesQuerySchema, noteResponseSchema } from '@cerebro/shared';
import { CreateNote } from '../usecases/create-note.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import type { Note } from '../domain/note.js';
import type { NoteResponse } from '@cerebro/shared';

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

export async function noteRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient },
) {
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
}
