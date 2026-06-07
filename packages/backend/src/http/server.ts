import path from 'node:path';

import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
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
import { authRoutes } from '../routes/auth-routes.js';
import { calendarRoutes } from '../routes/calendar-routes.js';
import { captureRoutes } from '../routes/capture-routes.js';
import { dayClosingRoutes } from '../routes/day-closing-routes.js';
import { eventRoutes } from '../routes/event-routes.js';
import { goalRoutes } from '../routes/goal-routes.js';
import { guideQuestionRoutes } from '../routes/guide-question-routes.js';
import { labelRoutes } from '../routes/label-routes.js';
import { noteRoutes } from '../routes/note-routes.js';
import { recapRoutes } from '../routes/recap-routes.js';
import { resourceRoutes } from '../routes/resource-routes.js';
import { searchRoutes } from '../routes/search-routes.js';
import { uploadRoutes } from '../routes/upload-routes.js';

// O payload do JWT carrega o id do usuário em `sub`; após `jwtVerify`, vira `req.user`.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

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

  // Auth via JWT (Bearer). Em produção defina JWT_SECRET; o default é só para dev.
  await app.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-me-please',
  });

  app.get('/health', async () => ({ status: 'ok' }));

  // Anexos vivem em disco; servimos o diretório de uploads em /uploads/*.
  const uploadDir =
    process.env['UPLOAD_DIR'] ?? path.resolve(process.cwd(), 'uploads');
  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
  });
  // Login é público.
  await app.register(authRoutes, { prisma });

  // Tudo o mais exige um JWT válido (Bearer). Escopo encapsulado: o hook vale só aqui.
  await app.register(async (api) => {
    api.addHook('onRequest', async (req, reply) => {
      try {
        await req.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    });

    await api.register(uploadRoutes, { uploadDir });
    await api.register(noteRoutes, { prisma });
    await api.register(attachmentRoutes, { prisma });
    await api.register(captureRoutes, { prisma });
    await api.register(labelRoutes, { prisma });
    await api.register(guideQuestionRoutes, { prisma });
    await api.register(agendaRoutes, { prisma });
    await api.register(resourceRoutes, { prisma });
    await api.register(goalRoutes, { prisma });
    await api.register(eventRoutes, { prisma });
    await api.register(dayClosingRoutes, { prisma });
    await api.register(calendarRoutes, { prisma });
    await api.register(searchRoutes, { prisma });
    await api.register(recapRoutes, { prisma });
  });

  return app;
}
