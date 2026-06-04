// Rascunho local do editor: rede de segurança para não perder texto offline.
// Guardado em localStorage (síncrono, simples — é só o doc atual de UMA nota).
// Limpo assim que a escrita é confirmada online.

const PREFIX = 'cerebro.draft.note.';

export function draftKey(noteId: string | null, type: string): string {
  return `${PREFIX}${noteId ?? `new:${type}`}`;
}

function store(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, doc: Record<string, unknown>): void {
  store()?.setItem(key, JSON.stringify(doc));
}

export function loadDraft(key: string): Record<string, unknown> | null {
  const raw = store()?.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  store()?.removeItem(key);
}
