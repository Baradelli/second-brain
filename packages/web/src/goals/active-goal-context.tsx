import type { GoalProgressResponse, GoalResponse } from '@cerebro/shared';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

/**
 * Estado vivo dos objetivos abertos, compartilhado entre a aba de detalhe (que
 * carrega/edita/marca) e o painel direito (que mostra progresso/cadência/vínculos
 * do objetivo ativo). Espelha o `active-resource-context` dos recursos.
 *
 * Guardamos por id do objetivo o último `GoalResponse` conhecido + o
 * `GoalProgressResponse` CALCULADO pelo backend (nunca recalculado aqui) e a
 * contagem de notas vinculadas, para o painel mostrar sem refazer a busca.
 */
export interface ActiveGoalState {
  goal: GoalResponse;
  /** Progresso calculado pelo backend (`getGoalProgress`). */
  progress: GoalProgressResponse | undefined;
  /** Quantas notas estão vinculadas — para o painel direito. */
  noteCount: number;
}

interface ActiveGoalsContextValue {
  get: (goalId: string) => ActiveGoalState | undefined;
  set: (goalId: string, state: ActiveGoalState) => void;
  clear: (goalId: string) => void;
}

const ActiveGoalsContext = createContext<ActiveGoalsContextValue | null>(null);

export function ActiveGoalsProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Record<string, ActiveGoalState>>({});

  const set = useCallback((goalId: string, state: ActiveGoalState) => {
    setById((prev) => ({ ...prev, [goalId]: state }));
  }, []);

  const clear = useCallback((goalId: string) => {
    setById((prev) => {
      if (!(goalId in prev)) return prev;
      const next = { ...prev };
      delete next[goalId];
      return next;
    });
  }, []);

  const value = useMemo<ActiveGoalsContextValue>(
    () => ({
      get: (goalId: string) => byId[goalId],
      set,
      clear,
    }),
    [byId, set, clear],
  );

  return (
    <ActiveGoalsContext.Provider value={value}>
      {children}
    </ActiveGoalsContext.Provider>
  );
}

export function useActiveGoals(): ActiveGoalsContextValue {
  const ctx = useContext(ActiveGoalsContext);
  if (!ctx) {
    throw new Error(
      'useActiveGoals must be used within an ActiveGoalsProvider',
    );
  }
  return ctx;
}
