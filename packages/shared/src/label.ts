import { z } from 'zod';

export const labelStatus = z.enum(['ACTIVE', 'ARCHIVED']);

export const createLabelSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().min(1).nullable().optional(),
  color: z.string().min(1).nullable().optional(),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;

export const editLabelSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).optional(),
  color: z.string().min(1).nullable().optional(),
  parentId: z.string().min(1).nullable().optional(), // null = vira raiz; ausente = não muda
});

export type EditLabelInput = z.infer<typeof editLabelSchema>;

export const archiveLabelSchema = z.object({});

export type ArchiveLabelInput = z.infer<typeof archiveLabelSchema>;

export type LabelResponse = {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  color: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: string | null;
  createdAt: string;
};

export type LabelNodeResponse = LabelResponse & {
  children: LabelNodeResponse[];
};

export const labelResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
  color: z.string().nullable(),
  status: labelStatus,
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const labelNodeResponseSchema: z.ZodType<LabelNodeResponse> = z.lazy(
  () =>
    labelResponseSchema.extend({
      children: z.array(labelNodeResponseSchema),
    }),
);
