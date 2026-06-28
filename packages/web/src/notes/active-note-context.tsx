import type { NoteResponse } from '@cerebro/shared';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Estado vivo das notas abertas, compartilhado entre o editor (que carrega e
 * edita) e o painel direito (que mostra propriedades/outline da nota ativa).
 *
 * Guardamos por id da nota: o `doc` atual (para o outline acompanhar a edição)
 * e os metadados (`note`) para as propriedades. O painel direito lê pela id do
 * descriptor da aba ativa — não precisa saber qual aba é.
 */
export interface ActiveNoteState {
  note: NoteResponse | null;
  doc: Record<string, unknown> | undefined;
}

/** Rola até o N-ésimo heading do editor (best-effort). */
type ScrollToHeading = (index: number) => void;

interface ActiveNotesContextValue {
  get: (noteId: string) => ActiveNoteState | undefined;
  setNote: (noteId: string, note: NoteResponse) => void;
  setDoc: (noteId: string, doc: Record<string, unknown>) => void;
  clear: (noteId: string) => void;
  /** O editor registra como rolar até um heading; devolve o de-registro. */
  registerScroller: (noteId: string, fn: ScrollToHeading) => () => void;
  scrollToHeading: (noteId: string, index: number) => void;
}

const ActiveNotesContext = createContext<ActiveNotesContextValue | null>(null);

export function ActiveNotesProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Record<string, ActiveNoteState>>({});

  const setNote = useCallback((noteId: string, note: NoteResponse) => {
    setById((prev) => ({
      ...prev,
      [noteId]: { note, doc: prev[noteId]?.doc ?? note.doc },
    }));
  }, []);

  const setDoc = useCallback((noteId: string, doc: Record<string, unknown>) => {
    setById((prev) => ({
      ...prev,
      [noteId]: { note: prev[noteId]?.note ?? null, doc },
    }));
  }, []);

  const clear = useCallback((noteId: string) => {
    setById((prev) => {
      if (!(noteId in prev)) return prev;
      const next = { ...prev };
      delete next[noteId];
      return next;
    });
  }, []);

  const scrollers = useRef<Map<string, ScrollToHeading>>(new Map());

  const registerScroller = useCallback(
    (noteId: string, fn: ScrollToHeading) => {
      scrollers.current.set(noteId, fn);
      return () => {
        if (scrollers.current.get(noteId) === fn) {
          scrollers.current.delete(noteId);
        }
      };
    },
    [],
  );

  const scrollToHeading = useCallback((noteId: string, index: number) => {
    scrollers.current.get(noteId)?.(index);
  }, []);

  const value = useMemo<ActiveNotesContextValue>(
    () => ({
      get: (noteId: string) => byId[noteId],
      setNote,
      setDoc,
      clear,
      registerScroller,
      scrollToHeading,
    }),
    [byId, setNote, setDoc, clear, registerScroller, scrollToHeading],
  );

  return (
    <ActiveNotesContext.Provider value={value}>
      {children}
    </ActiveNotesContext.Provider>
  );
}

export function useActiveNotes(): ActiveNotesContextValue {
  const ctx = useContext(ActiveNotesContext);
  if (!ctx) {
    throw new Error(
      'useActiveNotes must be used within an ActiveNotesProvider',
    );
  }
  return ctx;
}
