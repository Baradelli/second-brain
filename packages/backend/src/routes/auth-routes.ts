import { loginResponseSchema, loginSchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { InvalidCredentialsError } from '../domain/errors.js';
import { BcryptPasswordHasher } from '../repositories/bcrypt-password-hasher.js';
import { PrismaUserRepository } from '../repositories/prisma-user-repository.js';
import { AuthenticateUser } from '../usecases/authenticate-user.js';

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
        const token = app.jwt.sign({ sub: userId });
        return { token };
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          return reply.status(401).send({ error: error.message });
        }
        throw error;
      }
    },
  );
};
