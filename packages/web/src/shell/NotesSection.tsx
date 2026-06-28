import type { NoteResponse, NoteType } from '@cerebro/shared';
import { createNote, listNotes } from '@cerebro/shared/client';
import { EmptyState } from '@cerebro/ui';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';

const LABEL_BY_TYPE: Record<NoteType, string> = {
  DEVOTIONAL: 'editor.type.devotional',
  REFLECTION: 'editor.type.reflection',
  STUDY_NOTE: 'editor.type.study',
  NOTE: 'editor.type.note',
};

const COLOR_BY_TYPE: Record<NoteType, string> = {
  DEVOTIONAL: 'var(--cerebro-devotional)',
  REFLECTION: 'var(--cerebro-reflection)',
  STUDY_NOTE: 'var(--cerebro-study)',
  NOTE: 'var(--cerebro-note)',
};

/** Título visível de uma nota: usa o title, senão a primeira linha do texto. */
function noteLabel(note: NoteResponse, fallback: string): string {
  if (note.title?.trim()) return note.title.trim();
  const firstLine = note.plainText.split('\n').find((l) => l.trim());
  return firstLine?.trim() || fallback;
}

/**
 * Lista de notas dentro da seção "Notas" do explorador. Busca as notas ativas,
 * mostra título + dica de tipo, abre a nota numa aba ao clicar e oferece
 * "Nova nota" (cria uma nota NOTE/DAY — o default do mobile — e abre a aba).
 */
export function NotesSection() {
  const { t } = useTranslation();
  const { openTab } = useTabs();
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listNotes({ status: 'ACTIVE' })
      .then((data) => {
        if (!cancelled) setNotes(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleNewNote() {
    if (creating) return;
    setCreating(true);
    try {
      // Default do mobile: tipo NOTE, escopo DAY, doc vazio.
      const note = await createNote({ type: 'NOTE', scope: 'DAY', doc: {} });
      setNotes((prev) => [note, ...prev]);
      openTab({
        kind: 'note',
        id: note.id,
        title: noteLabel(note, t('notes.untitled')),
      });
    } catch {
      setError(true);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => void handleNewNote()}
        disabled={creating}
        className="mb-1 flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-accent transition-colors hover:bg-card disabled:opacity-50"
      >
        <Plus size={15} strokeWidth={2} />
        <span className="truncate">{t('notes.new')}</span>
      </button>

      {loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
      )}

      {error && !loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('notes.error')}</p>
      )}

      {!loading && !error && notes.length === 0 && (
        <EmptyState title={t('notes.empty')} className="py-6" />
      )}

      {!loading && !error && notes.length > 0 && (
        <ul className="flex flex-col">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() =>
                  openTab({
                    kind: 'note',
                    id: note.id,
                    title: noteLabel(note, t('notes.untitled')),
                  })
                }
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card"
              >
                <span
                  className="h-3.5 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: COLOR_BY_TYPE[note.type] }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {noteLabel(note, t('notes.untitled'))}
                  </span>
                  <span className="block truncate text-[0.625rem] uppercase tracking-[0.12em] text-faint">
                    {t(LABEL_BY_TYPE[note.type])}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
