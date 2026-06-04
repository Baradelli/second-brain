import { z } from 'zod';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333';

export const CURRENT_USER_ID = 'owner';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export function get<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
): Promise<z.infer<S>> {
  return request<z.infer<S>>(path).then((data) => schema.parse(data));
}

export function post<S extends z.ZodTypeAny>(
  path: string,
  body: unknown,
  schema: S,
): Promise<z.infer<S>> {
  return request<z.infer<S>>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((data) => schema.parse(data));
}

export function patch<S extends z.ZodTypeAny>(
  path: string,
  body: unknown,
  schema: S,
): Promise<z.infer<S>> {
  return request<z.infer<S>>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }).then((data) => schema.parse(data));
}
