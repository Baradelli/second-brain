import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { agendaRoutes } from '../routes/agenda-routes.js';
import { attachmentRoutes } from '../routes/attachment-routes.js';
import { captureRoutes } from '../routes/capture-routes.js';
import { guideQuestionRoutes } from '../routes/guide-question-routes.js';
import { labelRoutes } from '../routes/label-routes.js';
import { noteRoutes } from '../routes/note-routes.js';

export async function buildServer() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();
  const prisma = new PrismaClient();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(swagger, {
    openapi: {
      info: { title: 'Segundo Cérebro API', version: '0.0.0' },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(noteRoutes, { prisma });
  await app.register(attachmentRoutes, { prisma });
  await app.register(captureRoutes, { prisma });
  await app.register(labelRoutes, { prisma });
  await app.register(guideQuestionRoutes, { prisma });
  await app.register(agendaRoutes, { prisma });

  return app;
}
