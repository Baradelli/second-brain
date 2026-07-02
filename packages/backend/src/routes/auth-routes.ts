import { loginResponseSchema, loginSchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { InvalidCredentialsError } from '../domain/errors.js';
import { BcryptPasswordHasher } from '../repositories/bcrypt-password-hasher.js';
import { PrismaUserRepository } from '../repositories/prisma-user-repository.js';
import { AuthenticateUser } from '../usecases/authenticate-user.js';

// Vida do token (Tarefa 76): janela deslizante — o front renova no boot via
// /auth/refresh, então 15 dias só "vencem" para quem ficou 15 dias sem abrir o app.
const TOKEN_TTL = '15d';

export const authRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const authenticate = new AuthenticateUser(
    new PrismaUserRepository(options.prisma),
    new BcryptPasswordHasher(),
  );

  app.post(
    '/auth/login',
    {
      schema: {
        body: loginSchema,
        response: {
          200: loginResponseSchema,
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const { userId } = await authenticate.execute(req.body);
        const token = app.jwt.sign({ sub: userId }, { expiresIn: TOKEN_TTL });
        return { token };
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          return reply.status(401).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  // Troca um token AINDA VÁLIDO por um novo (renovação deslizante). Fica no
  // escopo público de propósito: o próprio handler verifica o Bearer e devolve
  // 401 limpo em vez do hook global.
  app.post(
    '/auth/refresh',
    {
      schema: {
        response: {
          200: loginResponseSchema,
          401: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        await req.jwtVerify();
      } catch {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const token = app.jwt.sign(
        { sub: req.user.sub },
        { expiresIn: TOKEN_TTL },
      );
      return { token };
    },
  );
};
