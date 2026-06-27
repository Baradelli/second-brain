import Anthropic from '@anthropic-ai/sdk';
import { aiRunRequestSchema, aiRunResponseSchema } from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { AnthropicRunner } from '../repositories/anthropic-runner.js';
import { CopyPasteRunner } from '../repositories/copy-paste-runner.js';
import { PrismaSettingsRepository } from '../repositories/prisma-settings-repository.js';
import { GetSettings } from '../usecases/get-settings.js';
import type { AiRunner } from '../usecases/ports/ai-runner.js';
import { RunAiSkill, type RunAiSkillInput } from '../usecases/run-ai-skill.js';

export const aiRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const settingsRepo = new PrismaSettingsRepository(options.prisma);
  const getSettings = new GetSettings(settingsRepo);
  const cheapRunner = new CopyPasteRunner();
  // Construído sob demanda: `new Anthropic()` exige ANTHROPIC_API_KEY no ambiente,
  // que só é necessária no modo conectado. Construir aqui quebraria o boot sem chave.
  let connectedRunner: AnthropicRunner | null = null;

  app.post(
    '/ai/run',
    {
      schema: {
        body: aiRunRequestSchema,
        response: {
          200: aiRunResponseSchema,
          502: z.object({ error: z.string() }),
          429: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      const userId = req.user.sub;
      const settings = await getSettings.execute({ userId });
      // No modo cheap o /ai/run não executa nada: ecoa o prompt (a IA não toca em dado).
      let runner: AiRunner;
      if (settings.aiMode === 'connected') {
        connectedRunner ??= new AnthropicRunner();
        runner = connectedRunner;
      } else {
        runner = cheapRunner;
      }

      const runAiSkill = new RunAiSkill(runner);

      try {
        const result = await runAiSkill.execute({
          ...req.body,
          userId,
        } as RunAiSkillInput);
        return result;
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError) {
          return reply.status(429).send({
            error: 'A IA está ocupada agora. Tente de novo em instantes.',
          });
        }
        if (
          error instanceof Anthropic.APIConnectionError ||
          (error instanceof Anthropic.APIError &&
            typeof error.status === 'number' &&
            error.status >= 500)
        ) {
          return reply.status(502).send({
            error: 'Não foi possível falar com a IA agora. Tente mais tarde.',
          });
        }
        throw error;
      }
    },
  );
};
