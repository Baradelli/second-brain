import {
  backlinkResponseSchema,
  noteGraphResponseSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { PrismaNoteLinkRepository } from '../repositories/prisma-note-link-repository.js';
import { PrismaNoteRepository } from '../repositories/prisma-note-repository.js';
import { BuildNoteGraph } from '../usecases/build-note-graph.js';
import { ListBacklinks } from '../usecases/list-backlinks.js';

export const graphRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const noteRepo = new PrismaNoteRepository(options.prisma);
  const linkRepo = new PrismaNoteLinkRepository(options.prisma);
  const listBacklinks = new ListBacklinks(noteRepo, linkRepo);
  const buildNoteGraph = new BuildNoteGraph(noteRepo, linkRepo);

  app.get(
    '/notes/:id/backlinks',
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: { 200: z.array(backlinkResponseSchema) },
      },
    },
    async (req) => {
      return listBacklinks.execute({
        userId: req.user.sub,
        noteId: req.params.id,
      });
    },
  );

  app.get(
    '/graph',
    {
      schema: {
        response: { 200: noteGraphResponseSchema },
      },
    },
    async (req) => {
      return buildNoteGraph.execute({ userId: req.user.sub });
    },
  );
};
