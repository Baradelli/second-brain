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

// Skills de compreensão de leitura (Tarefa 79).
const explainContext = z.object({
  excerpt: z.string().min(1),
  resourceTitle: z.string().optional(),
  level: z.enum(['eli5', 'technical']).optional(),
});

const socraticContext = z.object({
  title: z.string().min(1),
  fichamentoText: z.string().min(1),
});

const differenceMapContext = z.object({
  topic: z.string().min(1),
  sources: z
    .array(
      z.object({
        resourceTitle: z.string().min(1),
        author: z.string().optional(),
        fichamentoText: z.string().min(1),
      }),
    )
    .min(2), // comparar exige pelo menos dois autores
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
    skill: z.literal('study.explain'),
    context: explainContext,
    locale: promptLocale.optional(),
  }),
  z.object({
    skill: z.literal('study.socratic'),
    context: socraticContext,
    locale: promptLocale.optional(),
  }),
  z.object({
    skill: z.literal('study.difference_map'),
    context: differenceMapContext,
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
