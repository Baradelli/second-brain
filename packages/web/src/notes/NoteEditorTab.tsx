import {
  archiveNote,
  deleteNote,
  editNote,
  getNoteById,
  listNotes,
  unarchiveNote,
} from '@cerebro/shared/client';
import { Button, RichEditor } from '@cerebro/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '../shared/ConfirmDialog.js';
import { useTabs } from '../tabs/tabs-context.js';
import { useActiveNotes } from './active-note-context.js';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Debounce do save — espelha o mobile (EditorPage). */
const SAVE_DEBOUNCE_MS = 1500;

/** Título exibível de uma nota: título → 1ª linha não vazia → fallback. */
function noteDisplayTitle(
  note: { title?: string | null; plainText: string },
  fallback: string,
): string {
  const fromTitle = note.title?.trim();
  if (fromTitle) return fromTitle;
  const firstLine = note.plainText
    .split('\n')
    .find((line) => line.trim())
    ?.trim();
  return firstLine || fallback;
}

/**
 * Aba de edição de uma nota no desktop. Carrega a nota por id, alimenta o
 * RichEditor (TipTap) e salva com debounce via `editNote` — mesma semântica do
 * mobile (EditorPage): envia só `{ doc }`, o `plainText` é derivado no backend.
 * Publica a nota e o doc atual no ActiveNotesContext para o painel direito ler.
 */
export function NoteEditorTab({ noteId }: { noteId: string }) {
  const { t } = useTranslation();
  const { openTab, renameTab, closeTab, tabs } = useTabs();
  const { setNote, setDoc, clear, registerScroller } = useActiveNotes();

  const [doc, setDocState] = useState<Record<string, unknown> | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loadedTitle, setLoadedTitle] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);

  const editorRootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carrega a nota por id (mesma semântica do mobile: getNoteById → doc).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getNoteById(noteId)
      .then((note) => {
        if (cancelled) return;
        setDocState(note.doc);
        setNote(noteId, note);
        setArchived(note.status === 'ARCHIVED');
        setLoadedTitle(noteDisplayTitle(note, t('notes.untitled')));
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
  }, [noteId, setNote, t]);

  // Limpa o estado vivo da nota ao desmontar a aba.
  useEffect(() => () => clear(noteId), [noteId, clear]);

  // Quando a nota carrega, renomeia a própria aba com o título de verdade
  // (a aba pode ter sido aberta com "sem título" via link "@" ou criação).
  // O reducer faz no-op se o título não mudou, então isto não causa loop.
  useEffect(() => {
    if (loadedTitle === null) return;
    const own = tabs.find(
      (tab) => tab.descriptor.kind === 'note' && tab.descriptor.id === noteId,
    );
    if (own) renameTab(own.tabId, loadedTitle);
  }, [loadedTitle, tabs, noteId, renameTab]);

  // Rola até o N-ésimo heading renderizado no editor (best-effort).
  useEffect(() => {
    const scroll = (index: number) => {
      const root = editorRootRef.current;
      if (!root) return;
      const headings = root.querySelectorAll('.ProseMirror :is(h1, h2)');
      headings[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    return registerScroller(noteId, scroll);
  }, [noteId, registerScroller]);

  const handleChange = useCallback(
    (newDoc: Record<string, unknown>) => {
      setDoc(noteId, newDoc);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setSaveStatus('saving');

      debounceRef.current = setTimeout(() => {
        // Igual ao mobile: envia só `{ doc }` — o plainText é derivado no backend.
        editNote(noteId, { doc: newDoc })
          .then(() => {
            setSaveStatus('saved');
            savedTimerRef.current = setTimeout(
              () => setSaveStatus('idle'),
              2000,
            );
          })
          .catch(() => setSaveStatus('error'));
      }, SAVE_DEBOUNCE_MS);
    },
    [noteId, setDoc],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    [],
  );

  // Referência a outra nota via "@": busca por título/texto (exclui a atual).
  const searchNotes = useCallback(
    async (query: string) => {
      const all = await listNotes();
      const q = query.toLowerCase();
      return all
        .filter((n) => n.id !== noteId)
        .map((n) => ({
          id: n.id,
          label: noteDisplayTitle(n, t('notes.untitled')),
        }))
        .filter((n) => n.label.toLowerCase().includes(q))
        .slice(0, 8);
    },
    [noteId, t],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('agenda.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('notes.error')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          {archived ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void unarchiveNote(noteId)
                    .then(() => setArchived(false))
                    .catch(() => {})
                }
              >
                {t('common.restore')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirm('delete')}
                style={{ color: 'var(--cerebro-error)' }}
              >
                {t('common.deletePermanently')}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirm('archive')}
            >
              {t('notes.archive')}
            </Button>
          )}
        </div>
        <SaveIndicator status={saveStatus} t={t} />
      </div>
      <div ref={editorRootRef} className="min-h-0 flex-1 overflow-auto">
        <RichEditor
          doc={doc}
          editable
          placeholder={t('editor.placeholder')}
          onChange={handleChange}
          noteSearch={searchNotes}
          onOpenNoteLink={(id) =>
            openTab({ kind: 'note', id, title: t('notes.untitled') })
          }
        />
      </div>

      <ConfirmDialog
        open={confirm === 'archive'}
        tone="default"
        title={t('notes.archiveConfirm.title')}
        body={t('notes.archiveConfirm.body')}
        confirmLabel={t('notes.archiveConfirm.confirm')}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await archiveNote(noteId);
          setArchived(true);
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        tone="danger"
        title={t('notes.deleteConfirm.title')}
        body={t('notes.deleteConfirm.body')}
        confirmLabel={t('notes.deleteConfirm.confirm')}
        blockedMessage={t('notes.deleteBlocked')}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await deleteNote(noteId);
          setConfirm(null);
          const own = tabs.find(
            (tab) =>
              tab.descriptor.kind === 'note' && tab.descriptor.id === noteId,
          );
          if (own) closeTab(own.tabId);
        }}
      />
    </div>
  );
}

function SaveIndicator({
  status,
  t,
}: {
  status: SaveStatus;
  t: (key: string) => string;
}) {
  if (status === 'idle') return <div className="h-4 w-20" aria-hidden />;

  const configs = {
    saving: { color: 'var(--cerebro-accent)', textKey: 'editor.status.saving' },
    saved: { color: 'var(--cerebro-success)', textKey: 'editor.status.saved' },
    error: { color: 'var(--cerebro-error)', textKey: 'editor.status.error' },
  } as const;
  const cfg = configs[status];

  return (
    <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-muted">
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === 'saving' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: cfg.color }}
        aria-hidden
      />
      <span>{t(cfg.textKey)}</span>
    </div>
  );
}
