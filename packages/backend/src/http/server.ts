import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
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

  return app;
}
