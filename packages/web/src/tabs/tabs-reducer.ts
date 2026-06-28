// Lógica pura do sistema de abas (estilo Obsidian). Sem React aqui — só estado +
// transições, para poder testar com Vitest sem DOM. O Provider (tabs-context.tsx)
// embrulha isto num useReducer.

/** Os tipos de aba que o shell sabe abrir. Conteúdo real chega em fases posteriores. */
export type TabKind =
  | 'today'
  | 'review'
  | 'search'
  | 'calendar'
  | 'recaps'
  | 'assistant'
  | 'settings'
  | 'note'
  | 'resource'
  | 'goal'
  | 'studyItem'
  | 'publication'
  | 'graph';

/** Descreve o que uma aba está mostrando agora. */
export interface TabDescriptor {
  kind: TabKind;
  /** Identidade dentro do kind (ex.: id da nota). Para kinds singleton use o próprio kind. */
  id: string;
  title: string;
}

/**
 * Uma aba aberta. `descriptor` é a posição atual; `history`/`historyIndex`
 * guardam a navegação back/forward DENTRO desta aba (cada aba tem a sua pilha).
 */
export interface OpenTab {
  /** Id estável da aba — não muda quando navegamos dentro dela. */
  tabId: string;
  history: TabDescriptor[];
  historyIndex: number;
}

export interface TabsState {
  tabs: OpenTab[];
  activeTabId: string | null;
}

export const initialTabsState: TabsState = {
  tabs: [],
  activeTabId: null,
};

export type TabsAction =
  | { type: 'open'; descriptor: TabDescriptor; tabId: string }
  | { type: 'close'; tabId: string }
  | { type: 'setActive'; tabId: string }
  | { type: 'navigate'; descriptor: TabDescriptor }
  | { type: 'rename'; tabId: string; title: string }
  | { type: 'back' }
  | { type: 'forward' };

/** Descriptor atual de uma aba (a posição apontada por historyIndex). */
export function currentDescriptor(tab: OpenTab): TabDescriptor {
  const desc = tab.history[tab.historyIndex];
  // historyIndex é sempre mantido dentro dos limites pelas transições, então
  // isto nunca deveria faltar; o fallback existe só para satisfazer o TS estrito.
  if (!desc) {
    throw new Error(`Tab ${tab.tabId} has an empty history`);
  }
  return desc;
}

export function canGoBack(tab: OpenTab): boolean {
  return tab.historyIndex > 0;
}

export function canGoForward(tab: OpenTab): boolean {
  return tab.historyIndex < tab.history.length - 1;
}

function findActive(state: TabsState): OpenTab | undefined {
  return state.tabs.find((t) => t.tabId === state.activeTabId);
}

/** Acha uma aba já aberta cujo descriptor atual case por kind+id. */
function findByIdentity(
  state: TabsState,
  descriptor: TabDescriptor,
): OpenTab | undefined {
  return state.tabs.find((t) => {
    const cur = currentDescriptor(t);
    return cur.kind === descriptor.kind && cur.id === descriptor.id;
  });
}

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case 'open': {
      // Se já existe uma aba mostrando este kind+id, só foca (não duplica).
      const existing = findByIdentity(state, action.descriptor);
      if (existing) {
        return { ...state, activeTabId: existing.tabId };
      }
      const tab: OpenTab = {
        tabId: action.tabId,
        history: [action.descriptor],
        historyIndex: 0,
      };
      return {
        tabs: [...state.tabs, tab],
        activeTabId: tab.tabId,
      };
    }

    case 'close': {
      const index = state.tabs.findIndex((t) => t.tabId === action.tabId);
      if (index === -1) return state;

      const tabs = state.tabs.filter((t) => t.tabId !== action.tabId);

      // Se a aba fechada não era a ativa, a ativa não muda.
      if (state.activeTabId !== action.tabId) {
        return { ...state, tabs };
      }

      // Fechou a ativa: ativa o vizinho — preferindo o da esquerda, senão o da direita.
      if (tabs.length === 0) {
        return { tabs, activeTabId: null };
      }
      const neighborIndex = index > 0 ? index - 1 : 0;
      const neighbor = tabs[neighborIndex];
      return { tabs, activeTabId: neighbor ? neighbor.tabId : null };
    }

    case 'setActive': {
      const exists = state.tabs.some((t) => t.tabId === action.tabId);
      return exists ? { ...state, activeTabId: action.tabId } : state;
    }

    case 'navigate': {
      const active = findActive(state);
      if (!active) return state;
      // Navegar para o destino que já está ativo é no-op — não duplica histórico.
      const current = currentDescriptor(active);
      if (
        current.kind === action.descriptor.kind &&
        current.id === action.descriptor.id
      ) {
        return state;
      }
      // Empurra na pilha da aba ativa, truncando qualquer "forward" pendente.
      const truncated = active.history.slice(0, active.historyIndex + 1);
      const history = [...truncated, action.descriptor];
      const updated: OpenTab = {
        ...active,
        history,
        historyIndex: history.length - 1,
      };
      return {
        ...state,
        tabs: state.tabs.map((t) => (t.tabId === active.tabId ? updated : t)),
      };
    }

    case 'rename': {
      // Renomeia o título do descriptor ATUAL da aba (ex.: a nota carregou e
      // agora sabemos o título de verdade). Sem mudança real → no-op.
      const tab = state.tabs.find((t) => t.tabId === action.tabId);
      if (!tab) return state;
      if (currentDescriptor(tab).title === action.title) return state;
      const history = tab.history.map((d, i) =>
        i === tab.historyIndex ? { ...d, title: action.title } : d,
      );
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.tabId === action.tabId ? { ...t, history } : t,
        ),
      };
    }

    case 'back': {
      const active = findActive(state);
      if (!active || !canGoBack(active)) return state;
      const updated: OpenTab = {
        ...active,
        historyIndex: active.historyIndex - 1,
      };
      return {
        ...state,
        tabs: state.tabs.map((t) => (t.tabId === active.tabId ? updated : t)),
      };
    }

    case 'forward': {
      const active = findActive(state);
      if (!active || !canGoForward(active)) return state;
      const updated: OpenTab = {
        ...active,
        historyIndex: active.historyIndex + 1,
      };
      return {
        ...state,
        tabs: state.tabs.map((t) => (t.tabId === active.tabId ? updated : t)),
      };
    }

    default:
      return state;
  }
}
