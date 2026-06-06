import { z } from 'zod';

import { weekday } from './common.js';

export const goalType = z.enum(['HABIT', 'TARGET', 'PROJECT', 'UMBRELLA']);
export type GoalTypeInput = z.infer<typeof goalType>;

export const goalPeriod = z.enum(['day', 'week', 'month']);
export type GoalPeriodInput = z.infer<typeof goalPeriod>;

// Exclusividade cadência/medida NÃO cabe bem em Zod — fica no UseCase. Aqui só tipos/formatos.
export const createGoalSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(1),
  type: goalType,
  description: z.string().nullish(),
  targetValue: z.number().positive().nullish(),
  unit: z.string().nullish(),
  period: goalPeriod.nullish(),
  timesPerPeriod: z.number().int().positive().nullish(),
  weekdays: z.array(weekday).optional(),
  startAt: z.coerce.date().nullish(),
  dueAt: z.coerce.date().nullish(),
  parentId: z.string().nullish(),
  labelIds: z.array(z.string()).optional(),
});
export type CreateGoalBody = z.infer<typeof createGoalSchema>;

// type/parentId não são editáveis (recria-se para mudar).
export const editGoalSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(1).optional(),
  description: z.string().nullish(),
  targetValue: z.number().positive().nullish(),
  unit: z.string().nullish(),
  period: goalPeriod.nullish(),
  timesPerPeriod: z.number().int().positive().nullish(),
  weekdays: z.array(weekday).optional(),
  startAt: z.coerce.date().nullish(),
  dueAt: z.coerce.date().nullish(),
  labelIds: z.array(z.string()).optional(),
});
export type EditGoalBody = z.infer<typeof editGoalSchema>;

export const completeGoalSchema = z.object({
  userId: z.string().min(1),
  completedAt: z.coerce.date().optional(),
});
export type CompleteGoalBody = z.infer<typeof completeGoalSchema>;

export const archiveGoalSchema = z.object({
  userId: z.string().min(1),
  archivedAt: z.coerce.date().optional(),
});
export type ArchiveGoalBody = z.infer<typeof archiveGoalSchema>;

export const listGoalsQuerySchema = z.object({
  userId: z.string().min(1),
  type: goalType.optional(),
  parentId: z.string().optional(),
});
export type ListGoalsQuery = z.infer<typeof listGoalsQuerySchema>;

const dateRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export interface GoalProgressResponse {
  goalId: string;
  type: GoalTypeInput;
  done: number;
  target: number | null;
  ratio: number | null;
  period: { from: string; to: string } | null;
  completed: boolean;
  children?: GoalProgressResponse[];
}

export const goalProgressResponseSchema: z.ZodType<GoalProgressResponse> =
  z.lazy(() =>
    z.object({
      goalId: z.string(),
      type: goalType,
      done: z.number(),
      target: z.number().nullable(),
      ratio: z.number().nullable(),
      period: dateRangeSchema.nullable(),
      completed: z.boolean(),
      children: z.array(goalProgressResponseSchema).optional(),
    }),
  );

export const goalResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: goalType,
  parentId: z.string().nullable(),
  targetValue: z.number().nullable(),
  unit: z.string().nullable(),
  period: goalPeriod.nullable(),
  timesPerPeriod: z.number().nullable(),
  weekdays: z.array(weekday),
  startAt: z.string().datetime().nullable(),
  dueAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  labelIds: z.array(z.string()),
});
export type GoalResponse = z.infer<typeof goalResponseSchema>;

// Objetivo arquivado + flag de elegibilidade para exclusão (sem histórico de 'done').
export const archivedGoalSchema = goalResponseSchema.extend({
  deletable: z.boolean(),
});
export type ArchivedGoalResponse = z.infer<typeof archivedGoalSchema>;
