import path from 'node:path';

import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
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
import { dayClosingRoutes } from '../routes/day-closing-routes.js';
import { eventRoutes } from '../routes/event-routes.js';
import { goalRoutes } from '../routes/goal-routes.js';
import { guideQuestionRoutes } from '../routes/guide-question-routes.js';
import { labelRoutes } from '../routes/label-routes.js';
import { noteRoutes } from '../routes/note-routes.js';
import { resourceRoutes } from '../routes/resource-routes.js';
import { uploadRoutes } from '../routes/upload-routes.js';

export async function buildServer() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();
  const prisma = new PrismaClient();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // CORS: o front (Vite) roda em outra origem que a API. Em dev liberamos
  // qualquer origem; em prod, restrinja via CORS_ORIGIN (lista separada por vírgula).
  const corsEnv = process.env['CORS_ORIGIN'];
  await app.register(cors, {
    origin: corsEnv ? corsEnv.split(',').map((o) => o.trim()) : true,
  });

  await app.register(swagger, {
    openapi: {
      info: { title: 'Segundo Cérebro API', version: '0.0.0' },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', async () => ({ status: 'ok' }));

  // Anexos vivem em disco; servimos o diretório de uploads em /uploads/*.
  const uploadDir =
    process.env['UPLOAD_DIR'] ?? path.resolve(process.cwd(), 'uploads');
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
  });
  await app.register(uploadRoutes, { uploadDir });

  await app.register(noteRoutes, { prisma });
  await app.register(attachmentRoutes, { prisma });
  await app.register(captureRoutes, { prisma });
  await app.register(labelRoutes, { prisma });
  await app.register(guideQuestionRoutes, { prisma });
  await app.register(agendaRoutes, { prisma });
  await app.register(resourceRoutes, { prisma });
  await app.register(goalRoutes, { prisma });
  await app.register(eventRoutes, { prisma });
  await app.register(dayClosingRoutes, { prisma });

  return app;
}
