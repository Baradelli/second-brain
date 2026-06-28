import type { PublicationResponse } from '@cerebro/shared';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

/**
 * Estado vivo das publicações abertas, compartilhado entre a aba de detalhe (que
 * carrega/edita/avança o funil) e o painel direito (que mostra etapa/formato/
 * fonte/rascunho vinculado). Espelha o `active-study-context`.
 *
 * Guardamos por id o último `PublicationResponse` conhecido. O painel direito o
 * lê pela id da aba ativa.
 */
export interface ActivePublicationState {
  publication: PublicationResponse;
}

interface ActivePublicationContextValue {
  get: (publicationId: string) => ActivePublicationState | undefined;
  set: (publicationId: string, state: ActivePublicationState) => void;
  clear: (publicationId: string) => void;
}

const ActivePublicationContext =
  createContext<ActivePublicationContextValue | null>(null);

export function ActivePublicationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [byId, setById] = useState<Record<string, ActivePublicationState>>({});

  const set = useCallback(
    (publicationId: string, state: ActivePublicationState) => {
      setById((prev) => ({ ...prev, [publicationId]: state }));
    },
    [],
  );

  const clear = useCallback((publicationId: string) => {
    setById((prev) => {
      if (!(publicationId in prev)) return prev;
      const next = { ...prev };
      delete next[publicationId];
      return next;
    });
  }, []);

  const value = useMemo<ActivePublicationContextValue>(
    () => ({
      get: (publicationId: string) => byId[publicationId],
      set,
      clear,
    }),
    [byId, set, clear],
  );

  return (
    <ActivePublicationContext.Provider value={value}>
      {children}
    </ActivePublicationContext.Provider>
  );
}

export function useActivePublications(): ActivePublicationContextValue {
  const ctx = useContext(ActivePublicationContext);
  if (!ctx) {
    throw new Error(
      'useActivePublications must be used within an ActivePublicationsProvider',
    );
  }
  return ctx;
}
