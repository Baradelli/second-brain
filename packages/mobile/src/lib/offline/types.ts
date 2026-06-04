import type { NoteType } from '@cerebro/shared';

// ── Comandos enfileirados (operações de escrita feitas offline) ─────────────────
// Cada comando é serializável e idempotente pela ordem: só sai da fila após sucesso.

export interface CreateCaptureCommand {
  id: string;
  type: 'createCapture';
  createdAt: string;
  payload: { text: string };
}

export interface CreateNoteCommand {
  id: string;
  type: 'createNote';
  createdAt: string;
  payload: {
    clientId: string; // id temporário do cliente, reconciliado com o id real no sync
    noteType: NoteType;
    doc: Record<string, unknown>;
    title?: string;
    scope?: string;
    date?: string;
  };
}

export interface EditNoteCommand {
  id: string;
  type: 'editNote';
  createdAt: string;
  // ref pode ser um id real do servidor OU um clientId de nota criada offline
  payload: { ref: string; doc?: Record<string, unknown>; title?: string };
}

export type Command =
  | CreateCaptureCommand
  | CreateNoteCommand
  | EditNoteCommand;

// `seq` é a chave auto-incremental do IndexedDB → ordem de inserção estável.
export type StoredCommand = Command & { seq: number };

export interface CommandQueue {
  enqueue(cmd: Command): Promise<void>;
  all(): Promise<StoredCommand[]>;
  remove(seq: number): Promise<void>;
  size(): Promise<number>;
  /** Registra o mapeamento id temporário (clientId) → id real do servidor. */
  mapId(clientId: string, realId: string): Promise<void>;
  /** Resolve uma referência: id real mapeado, ou a própria ref se não houver mapa. */
  resolveRef(ref: string): Promise<string>;
  clear(): Promise<void>;
}

export interface OfflineApi {
  createCapture(text: string): Promise<{ id: string }>;
  createNote(input: {
    type: NoteType;
    doc: Record<string, unknown>;
    title?: string;
    scope?: string;
    date?: string;
  }): Promise<{ id: string }>;
  editNote(
    id: string,
    body: { doc?: Record<string, unknown>; title?: string },
  ): Promise<{ id: string }>;
}
