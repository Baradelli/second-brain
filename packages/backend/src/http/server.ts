import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

/**
 * Servidor base. As rotas de negócio são registradas a partir da Tarefa 04
 * (ver docs/tasks). Aqui só a fundação: Zod como validador/serializador + Swagger.
 */
export async function buildServer() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  // Zod valida a entrada e serializa a saída; o mesmo schema alimenta o OpenAPI.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(swagger, {
    openapi: {
      info: { title: 'Segundo Cérebro API', version: '0.0.0' },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get('/health', async () => ({ status: 'ok' }));

  // TODO (Tarefa 04+): app.register(noteRoutes), app.register(captureRoutes), etc.

  return app;
}

const port = Number(process.env.PORT ?? 3333);

buildServer()
  .then((app) => app.listen({ port, host: '0.0.0.0' }))
  .then(() => {
    console.log(`Backend on http://localhost:${port} — docs em /docs`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
