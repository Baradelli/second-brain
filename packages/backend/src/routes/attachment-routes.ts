import type { AttachmentResponse } from '@cerebro/shared';
import { attachFileSchema, attachmentResponseSchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import type { Attachment } from '../domain/attachment.js';
import { PrismaAttachmentRepository } from '../repositories/prisma-attachment-repository.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { AttachFile } from '../usecases/attach-file.js';

function toResponse(a: Attachment): AttachmentResponse {
  return {
    id: a.id,
    userId: a.userId,
    noteId: a.noteId,
    captureId: a.captureId,
    url: a.url,
    type: a.type,
    mimeType: a.mimeType,
    name: a.name,
    size: a.size,
    transcription: a.transcription,
    ocrStatus: a.ocrStatus,
    createdAt: a.createdAt.toISOString(),
  };
}

export const attachmentRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const attachRepo = new PrismaAttachmentRepository(options.prisma);
  const noteRepo = new PrismaNoteRepository(options.prisma);
  const attachFile = new AttachFile(attachRepo, noteRepo);

  app.post(
    '/notes/:id/attachments',
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: attachFileSchema.omit({ noteId: true }),
        response: { 201: attachmentResponseSchema },
      },
    },
    async (req, reply) => {
      const attachment = await attachFile.execute({
        ...req.body,
        noteId: req.params.id,
      });
      return reply.status(201).send(toResponse(attachment));
    },
  );

  app.get(
    '/notes/:id/attachments',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: z.array(attachmentResponseSchema) },
      },
    },
    async (req) => {
      const list = await attachRepo.listByNote(req.params.id);
      return list.map(toResponse);
    },
  );
};
