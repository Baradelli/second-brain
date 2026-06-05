import type { NoteType } from '@cerebro/shared';

import { createCapture, createNote, editNote } from '../api/endpoints.js';
import { OfflineQueue } from './queue.js';
import { processQueue, type SyncResult } from './sync.js';
import type { OfflineApi } from './types.js';

const queue = new OfflineQueue();
const api: OfflineApi = { createCapture, createNote, editNote };

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function newId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `cid-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Captura ─────────────────────────────────────────────────────────────────────

/** Tenta enviar a captura; se offline ou falhar, enfileira (não perde nada). */
export async function submitCapture(
  text: string,
): Promise<{ queued: boolean }> {
  if (!isOffline()) {
    try {
      await api.createCapture(text);
      return { queued: false };
    } catch {
      // rede falhou — cai para a fila
    }
  }
  await queue.enqueue({
    id: newId(),
    type: 'createCapture',
    createdAt: nowIso(),
    payload: { text },
  });
  return { queued: true };
}

// ── Notas (escrita) ──────────────────────────────────────────────────────────────

export interface PersistNoteCreateInput {
  noteType: NoteType;
  doc: Record<string, unknown>;
  title?: string;
  scope?: string;
  date?: string;
  resourceId?: string;
}

/**
 * Cria a nota online; se offline/falha, enfileira e devolve um clientId temporário
 * para a UI seguir editando. O sync reconcilia o clientId com o id real.
 */
export async function persistNoteCreate(
  input: PersistNoteCreateInput,
): Promise<{ id: string; queued: boolean }> {
  if (!isOffline()) {
    try {
      const note = await api.createNote({
        type: input.noteType,
        doc: input.doc,
        title: input.title,
        scope: input.scope,
        date: input.date,
        resourceId: input.resourceId,
      });
      return { id: note.id, queued: false };
    } catch {
      // cai para a fila
    }
  }
  const clientId = newId();
  await queue.enqueue({
    id: newId(),
    type: 'createNote',
    createdAt: nowIso(),
    payload: { clientId, ...input },
  });
  return { id: clientId, queued: true };
}

/** Edita a nota online; se offline/falha, enfileira (ref pode ser id real ou clientId). */
export async function persistNoteEdit(
  ref: string,
  body: { doc?: Record<string, unknown>; title?: string },
): Promise<{ queued: boolean }> {
  if (!isOffline()) {
    try {
      // resolve caso a ref ainda seja um clientId de nota criada offline já sincronizada
      const realRef = await queue.resolveRef(ref);
      await api.editNote(realRef, body);
      return { queued: false };
    } catch {
      // cai para a fila
    }
  }
  await queue.enqueue({
    id: newId(),
    type: 'editNote',
    createdAt: nowIso(),
    payload: { ref, ...body },
  });
  return { queued: true };
}

/** Traduz um clientId temporário para o id real, se já sincronizado. */
export function resolveNoteRef(ref: string): Promise<string> {
  return queue.resolveRef(ref);
}

// ── Sync ─────────────────────────────────────────────────────────────────────────

export function syncNow(): Promise<SyncResult> {
  return processQueue(queue, api);
}

let started = false;

/** Registra o flush da fila ao reconectar e tenta uma vez ao iniciar. */
export function startOfflineSync(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', () => void syncNow());
  void syncNow();
}
