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

import {
  NoteHasReferencesError,
  NoteNotArchivedError,
  NoteNotFoundError,
} from '../domain/errors.js';
import type { Note } from '../domain/note.js';
import { PrismaAttachmentRepository } from '../repositories/prisma-attachment-repository.js';
import { PrismaNoteLinkRepository } from '../repositories/prisma-note-link-repository.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { PrismaPublicationRepository } from '../repositories/prisma-publication-repository.js';
import { PrismaStudyItemRepository } from '../repositories/prisma-study-item-repository.js';
import { ArchiveNote } from '../usecases/archive-note.js';
import { CreateNote } from '../usecases/create-note.js';
import { DeleteNote } from '../usecases/delete-note.js';
import { EditNote } from '../usecases/edit-note.js';
import { UnarchiveNote } from '../usecases/unarchive-note.js';

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
  const linkRepo = new PrismaNoteLinkRepository(options.prisma);
  const attachmentRepo = new PrismaAttachmentRepository(options.prisma);
  const studyItemRepo = new PrismaStudyItemRepository(options.prisma);
  const publicationRepo = new PrismaPublicationRepository(options.prisma);
  const createNote = new CreateNote(repo, linkRepo);
  const editNote = new EditNote(repo, linkRepo);
  const archiveNote = new ArchiveNote(repo);
  const unarchiveNote = new UnarchiveNote(repo);
  const deleteNote = new DeleteNote(
    repo,
    linkRepo,
    attachmentRepo,
    studyItemRepo,
    publicationRepo,
  );

  app.post(
    '/notes',
    {
      schema: {
        body: createNoteSchema.omit({ userId: true }),
        response: { 201: noteResponseSchema },
      },
    },
    async (req, reply) => {
      const note = await createNote.execute({
        ...req.body,
        userId: req.user.sub,
      });
      return reply.status(201).send(toResponse(note));
    },
  );

  app.get(
    '/notes',
    {
      schema: {
        querystring: listNotesQuerySchema.omit({ userId: true }),
        response: { 200: z.array(noteResponseSchema) },
      },
    },
    async (req) => {
      const notes = await repo.find({ ...req.query, userId: req.user.sub });
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

  app.post(
    '/notes/:id/archive',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({}),
        response: {
          200: noteResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const note = await archiveNote.execute({ id: req.params.id });
        return reply.status(200).send(toResponse(note));
      } catch (err) {
        if (err instanceof NoteNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.post(
    '/notes/:id/unarchive',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({}),
        response: {
          200: noteResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const note = await unarchiveNote.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return reply.status(200).send(toResponse(note));
      } catch (err) {
        if (err instanceof NoteNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.post(
    '/notes/:id/delete',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({}),
        response: {
          200: noteResponseSchema,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const note = await deleteNote.execute({
          id: req.params.id,
          userId: req.user.sub,
        });
        return reply.status(200).send(toResponse(note));
      } catch (err) {
        if (err instanceof NoteNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        if (
          err instanceof NoteNotArchivedError ||
          err instanceof NoteHasReferencesError
        ) {
          return reply.status(409).send({ error: err.message });
        }
        throw err;
      }
    },
  );
};
