import { z } from 'zod';

export const createGuideQuestionSchema = z.object({
  userId: z.string().min(1),
  labelId: z.string().min(1),
  text: z.string().min(1),
  order: z.number().int().default(0),
});

export type CreateGuideQuestionInput = z.infer<
  typeof createGuideQuestionSchema
>;

export const toggleGuideQuestionSchema = z.object({
  active: z.boolean(),
});

export type ToggleGuideQuestionInput = z.infer<
  typeof toggleGuideQuestionSchema
>;

export const suggestedQuestionsQuerySchema = z.object({
  labelIds: z.preprocess(
    (value) => {
      if (Array.isArray(value))
        return value.flatMap((item) => String(item).split(','));
      if (typeof value === 'string') return value.split(',');
      return value;
    },
    z.array(z.string().min(1)).default([]),
  ),
});

export type SuggestedQuestionsQuery = z.infer<
  typeof suggestedQuestionsQuerySchema
>;

export type GuideQuestionResponse = {
  id: string;
  labelId: string;
  text: string;
  order: number;
  active: boolean;
};

export type SuggestedQuestionsGroupResponse = {
  label: { id: string; name: string };
  questions: GuideQuestionResponse[];
};

export const guideQuestionResponseSchema = z.object({
  id: z.string(),
  labelId: z.string(),
  text: z.string(),
  order: z.number().int(),
  active: z.boolean(),
});

export const suggestedQuestionsGroupResponseSchema = z.object({
  label: z.object({ id: z.string(), name: z.string() }),
  questions: z.array(guideQuestionResponseSchema),
});
