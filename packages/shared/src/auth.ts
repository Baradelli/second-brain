import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof loginSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
