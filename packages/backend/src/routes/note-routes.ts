import type { NoteResponse } from '@cerebro/shared';
import {
  createNoteSchema,
  editNoteBodySchema,
  listNotesQuerySchema,
  noteResponseSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { NoteNotFoundError } from '../domain/errors.js';
import type { Note } from '../domain/note.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { CreateNote } from '../usecases/create-note.js';
import { EditNote } from '../usecases/edit-note.js';

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

export const noteRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const repo = new PrismaNoteRepository(options.prisma);
  const createNote = new CreateNote(repo);
  const editNote = new EditNote(repo);

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

  app.get(
    '/notes/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: noteResponseSchema },
      },
    },
    async (req, reply) => {
      const note = await repo.byId(req.params.id);
      if (!note) {
        return reply.status(404).send({ error: 'Note not found' });
      }
      return toResponse(note);
    },
  );

  app.patch(
    '/notes/:id',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: editNoteBodySchema,
        response: { 200: noteResponseSchema },
      },
    },
    async (req, reply) => {
      try {
        const note = await editNote.execute({ id: req.params.id, ...req.body });
        return reply.status(200).send(toResponse(note));
      } catch (err) {
        if (err instanceof NoteNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );
};
