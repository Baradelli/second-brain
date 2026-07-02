import {
  createGuideQuestionSchema,
  type GuideQuestionResponse,
  guideQuestionResponseSchema,
  suggestedQuestionsGroupResponseSchema,
  suggestedQuestionsQuerySchema,
  toggleGuideQuestionSchema,
} from '@cerebro/shared';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import {
  GuideQuestionNotFoundError,
  LabelNotFoundError,
} from '../domain/errors.js';
import type { GuideQuestion } from '../domain/guide-question.js';
import { PrismaGuideQuestionRepository } from '../repositories/prisma-guide-question-repository.js';
import { CreateGuideQuestion } from '../usecases/create-guide-question.js';
import { SuggestedQuestionsForNote } from '../usecases/suggested-questions-for-note.js';
import { ToggleGuideQuestion } from '../usecases/toggle-guide-question.js';

function toResponse(question: GuideQuestion): GuideQuestionResponse {
  return {
    id: question.id,
    labelId: question.labelId,
    text: question.text,
    order: question.order,
    active: question.active,
  };
}

export const guideQuestionRoutes: FastifyPluginAsyncZod<{
  prisma: PrismaClient;
}> = async (app, options) => {
  const repo = new PrismaGuideQuestionRepository(options.prisma);
  const createGuideQuestion = new CreateGuideQuestion(repo);
  const toggleGuideQuestion = new ToggleGuideQuestion(repo);
  const suggestedQuestions = new SuggestedQuestionsForNote(repo);

  app.post(
    '/labels/:id/questions',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: createGuideQuestionSchema.omit({ labelId: true }),
        response: {
          201: guideQuestionResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const question = await createGuideQuestion.execute({
          ...req.body,
          labelId: req.params.id,
        });
        return reply.status(201).send(toResponse(question));
      } catch (error) {
        if (error instanceof LabelNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/guide-questions/:id/toggle',
    {
      schema: {
        params: z.object({ id: z.string().min(1) }),
        body: toggleGuideQuestionSchema,
        response: {
          200: guideQuestionResponseSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (req, reply) => {
      try {
        const question = await toggleGuideQuestion.execute({
          id: req.params.id,
          userId: req.user.sub,
          active: req.body.active,
        });
        return toResponse(question);
      } catch (error) {
        if (error instanceof GuideQuestionNotFoundError) {
          return reply.status(404).send({ error: error.message });
        }
        throw error;
      }
    },
  );

  app.get(
    '/notes/suggested-questions',
    {
      schema: {
        querystring: suggestedQuestionsQuerySchema,
        response: { 200: z.array(suggestedQuestionsGroupResponseSchema) },
      },
    },
    async (req) => {
      const groups = await suggestedQuestions.execute({
        labelIds: req.query.labelIds,
      });
      return groups.map((group) => ({
        label: group.label,
        questions: group.questions.map(toResponse),
      }));
    },
  );
};
