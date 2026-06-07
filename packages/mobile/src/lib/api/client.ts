import { z } from 'zod';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3333';

export const CURRENT_USER_ID = 'owner';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // FormData define seu próprio Content-Type (com boundary) — não sobrescrever.
  const isFormData =
    typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const baseHeaders: Record<string, string> = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...baseHeaders, ...init?.headers },
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

/** DELETE sem corpo de resposta (204). Não tenta parsear JSON. */
export async function del(path: string, body?: unknown): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
}

/**
 * Envia um arquivo via multipart/form-data. Não seta Content-Type — o browser
 * monta o boundary sozinho. Usado pelo upload de anexos (disco do servidor).
 */
export function postFile<S extends z.ZodTypeAny>(
  path: string,
  file: File,
  schema: S,
): Promise<z.infer<S>> {
  const form = new FormData();
  form.append('file', file);
  return request<z.infer<S>>(path, { method: 'POST', body: form }).then(
    (data) => schema.parse(data),
  );
}
