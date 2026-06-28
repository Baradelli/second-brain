import type { ResourceResponse } from '@cerebro/shared';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

/**
 * Estado vivo dos recursos abertos, compartilhado entre a aba de detalhe (que
 * carrega e edita) e o painel direito (que mostra propriedades/vínculos do
 * recurso ativo). Espelha o `active-note-context` das notas.
 *
 * Guardamos por id do recurso o último `ResourceResponse` conhecido (e a
 * contagem de fichamentos vinculados, para o painel mostrar sem refazer a
 * busca). O painel direito lê pela id do descriptor da aba ativa.
 */
export interface ActiveResourceState {
  resource: ResourceResponse;
  /** Quantos fichamentos (notas) estão vinculados — para o painel direito. */
  noteCount: number;
}

interface ActiveResourcesContextValue {
  get: (resourceId: string) => ActiveResourceState | undefined;
  set: (resourceId: string, state: ActiveResourceState) => void;
  clear: (resourceId: string) => void;
}

const ActiveResourcesContext =
  createContext<ActiveResourcesContextValue | null>(null);

export function ActiveResourcesProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Record<string, ActiveResourceState>>({});

  const set = useCallback((resourceId: string, state: ActiveResourceState) => {
    setById((prev) => ({ ...prev, [resourceId]: state }));
  }, []);

  const clear = useCallback((resourceId: string) => {
    setById((prev) => {
      if (!(resourceId in prev)) return prev;
      const next = { ...prev };
      delete next[resourceId];
      return next;
    });
  }, []);

  const value = useMemo<ActiveResourcesContextValue>(
    () => ({
      get: (resourceId: string) => byId[resourceId],
      set,
      clear,
    }),
    [byId, set, clear],
  );

  return (
    <ActiveResourcesContext.Provider value={value}>
      {children}
    </ActiveResourcesContext.Provider>
  );
}

export function useActiveResources(): ActiveResourcesContextValue {
  const ctx = useContext(ActiveResourcesContext);
  if (!ctx) {
    throw new Error(
      'useActiveResources must be used within an ActiveResourcesProvider',
    );
  }
  return ctx;
}
