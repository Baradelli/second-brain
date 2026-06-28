import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';

/**
 * Barra de abas no topo do painel central. À esquerda, setas back/forward
 * (por aba). Cada aba mostra título + botão de fechar; a ativa fica destacada.
 */
export function TabBar() {
  const { t } = useTranslation();
  const { tabs, activeTabId, activeTab, setActive, closeTab, back, forward } =
    useTabs();

  return (
    <div className="flex h-10 items-stretch border-b border-subtle bg-bg">
      <div className="flex items-center gap-0.5 px-1">
        <button
          type="button"
          onClick={back}
          disabled={!activeTab?.canGoBack}
          aria-label={t('shell.back')}
          className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-card disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={forward}
          disabled={!activeTab?.canGoForward}
          aria-label={t('shell.forward')}
          className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-card disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex flex-1 items-stretch overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.tabId === activeTabId;
          return (
            <div
              key={tab.tabId}
              className={`group flex max-w-[14rem] min-w-0 items-center gap-1 border-r border-subtle px-3 text-sm ${
                isActive
                  ? 'bg-card text-fg'
                  : 'text-muted hover:bg-card/50 hover:text-fg'
              }`}
            >
              <button
                type="button"
                onClick={() => setActive(tab.tabId)}
                className="min-w-0 flex-1 truncate py-2 text-left"
                title={tab.descriptor.title}
              >
                {tab.descriptor.title}
              </button>
              <button
                type="button"
                onClick={() => closeTab(tab.tabId)}
                aria-label={t('shell.close')}
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-raised hover:text-fg"
              >
                <X size={13} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
