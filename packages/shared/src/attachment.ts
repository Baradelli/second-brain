import { z } from 'zod';

export const attachmentType = z.enum([
  'image',
  'pdf',
  'audio',
  'video',
  'other',
]);
export type AttachmentType = z.infer<typeof attachmentType>;

export const attachFileSchema = z.object({
  userId: z.string().min(1),
  noteId: z.string().min(1),
  url: z.string().url(),
  type: attachmentType,
  mimeType: z.string().optional(),
  name: z.string().optional(),
  size: z.number().int().optional(),
});

export type AttachFileInput = z.infer<typeof attachFileSchema>;

export const attachmentResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  noteId: z.string().nullable(),
  captureId: z.string().nullable(),
  url: z.string(),
  type: z.string(),
  mimeType: z.string().nullable(),
  name: z.string().nullable(),
  size: z.number().nullable(),
  transcription: z.string().nullable(),
  ocrStatus: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type AttachmentResponse = z.infer<typeof attachmentResponseSchema>;
