import { z } from 'zod';

// Schemas de borda do modo conectado (Bloco P, Tarefa 73). Validam a requisição de
// POST /ai/run. Os contextos espelham as interfaces de prompt/types.ts (fonte dos templates).

export const promptLocale = z.enum(['pt', 'en']);

const studyQuestionsContext = z.object({
  title: z.string().min(1),
  reference: z.string().optional(),
  resourceTitle: z.string().optional(),
  author: z.string().optional(),
});

const fichamentoFeedbackContext = z.object({
  title: z.string().min(1),
  fichamentoText: z.string().min(1),
  sourceHint: z.string().optional(),
});

const quizContext = z.object({
  title: z.string().min(1),
  topics: z.array(z.string()).optional(),
});

const publishDraftContext = z.object({
  format: z.enum(['linkedin', 'substack', 'blog', 'lesson', 'video']),
  sourceText: z.string().min(1),
  angle: z.string().optional(),
});

export const aiRunRequestSchema = z.discriminatedUnion('skill', [
  z.object({
    skill: z.literal('study.questions'),
    context: studyQuestionsContext,
    locale: promptLocale.optional(),
  }),
  z.object({
    skill: z.literal('study.fichamento_feedback'),
    context: fichamentoFeedbackContext,
    locale: promptLocale.optional(),
  }),
  z.object({
    skill: z.literal('study.quiz'),
    context: quizContext,
    locale: promptLocale.optional(),
  }),
  z.object({
    skill: z.literal('publish.draft'),
    context: publishDraftContext,
    locale: promptLocale.optional(),
  }),
]);
export type AiRunRequest = z.infer<typeof aiRunRequestSchema>;

export const aiRunResponseSchema = z.object({
  text: z.string(),
});
export type AiRunResponse = z.infer<typeof aiRunResponseSchema>;
