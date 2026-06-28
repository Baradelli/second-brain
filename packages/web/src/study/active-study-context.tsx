import type { RecallConfidenceInput, StudyItemResponse } from '@cerebro/shared';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

/**
 * Estado vivo dos itens de estudo abertos, compartilhado entre a aba de detalhe
 * (que carrega/edita/registra recalls) e o painel direito (que mostra
 * durabilidade/próxima revisão/recurso vinculado). Espelha o
 * `active-goal-context` dos objetivos.
 *
 * Guardamos por id o último `StudyItemResponse` conhecido (com o `schedule`
 * CALCULADO pelo backend — nunca recalculado aqui) + as confianças A/B/C
 * registradas nesta sessão (a API não expõe o log de recalls; só temos o que
 * marcamos aqui), para o painel resumir "o que você sabe menos".
 */
export interface ActiveStudyState {
  item: StudyItemResponse;
  /** Confianças A/B/C registradas nesta sessão (ordem cronológica). */
  confidences: RecallConfidenceInput[];
}

interface ActiveStudyContextValue {
  get: (studyItemId: string) => ActiveStudyState | undefined;
  set: (studyItemId: string, state: ActiveStudyState) => void;
  clear: (studyItemId: string) => void;
}

const ActiveStudyContext = createContext<ActiveStudyContextValue | null>(null);

export function ActiveStudyProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Record<string, ActiveStudyState>>({});

  const set = useCallback((studyItemId: string, state: ActiveStudyState) => {
    setById((prev) => ({ ...prev, [studyItemId]: state }));
  }, []);

  const clear = useCallback((studyItemId: string) => {
    setById((prev) => {
      if (!(studyItemId in prev)) return prev;
      const next = { ...prev };
      delete next[studyItemId];
      return next;
    });
  }, []);

  const value = useMemo<ActiveStudyContextValue>(
    () => ({
      get: (studyItemId: string) => byId[studyItemId],
      set,
      clear,
    }),
    [byId, set, clear],
  );

  return (
    <ActiveStudyContext.Provider value={value}>
      {children}
    </ActiveStudyContext.Provider>
  );
}

export function useActiveStudy(): ActiveStudyContextValue {
  const ctx = useContext(ActiveStudyContext);
  if (!ctx) {
    throw new Error(
      'useActiveStudy must be used within an ActiveStudyProvider',
    );
  }
  return ctx;
}
