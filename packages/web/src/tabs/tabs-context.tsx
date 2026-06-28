import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import {
  canGoBack,
  canGoForward,
  currentDescriptor,
  initialTabsState,
  type OpenTab,
  type TabDescriptor,
  tabsReducer,
} from './tabs-reducer.js';

/** Aba como a UI a consome: id estável, descriptor atual e flags de navegação. */
export interface TabView {
  tabId: string;
  descriptor: TabDescriptor;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface TabsContextValue {
  tabs: TabView[];
  activeTabId: string | null;
  activeTab: TabView | null;
  /** Abre (ou foca, se já aberta por kind+id) uma aba. */
  openTab: (descriptor: TabDescriptor) => void;
  closeTab: (tabId: string) => void;
  setActive: (tabId: string) => void;
  /** Navega dentro da aba ativa, empilhando no histórico dela. */
  navigateInTab: (descriptor: TabDescriptor) => void;
  /** Renomeia o título atual de uma aba (ex.: depois que o conteúdo carrega). */
  renameTab: (tabId: string, title: string) => void;
  back: () => void;
  forward: () => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function toView(tab: OpenTab): TabView {
  return {
    tabId: tab.tabId,
    descriptor: currentDescriptor(tab),
    canGoBack: canGoBack(tab),
    canGoForward: canGoForward(tab),
  };
}

export function TabsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tabsReducer, initialTabsState);
  const counter = useRef(0);

  const openTab = useCallback((descriptor: TabDescriptor) => {
    const tabId = `tab-${counter.current++}`;
    dispatch({ type: 'open', descriptor, tabId });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    dispatch({ type: 'close', tabId });
  }, []);

  const setActive = useCallback((tabId: string) => {
    dispatch({ type: 'setActive', tabId });
  }, []);

  const navigateInTab = useCallback((descriptor: TabDescriptor) => {
    dispatch({ type: 'navigate', descriptor });
  }, []);

  const renameTab = useCallback((tabId: string, title: string) => {
    dispatch({ type: 'rename', tabId, title });
  }, []);

  const back = useCallback(() => dispatch({ type: 'back' }), []);
  const forward = useCallback(() => dispatch({ type: 'forward' }), []);

  const value = useMemo<TabsContextValue>(() => {
    const tabs = state.tabs.map(toView);
    const activeTab = tabs.find((t) => t.tabId === state.activeTabId) ?? null;
    return {
      tabs,
      activeTabId: state.activeTabId,
      activeTab,
      openTab,
      closeTab,
      setActive,
      navigateInTab,
      renameTab,
      back,
      forward,
    };
  }, [
    state,
    openTab,
    closeTab,
    setActive,
    navigateInTab,
    renameTab,
    back,
    forward,
  ]);

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return ctx;
}
