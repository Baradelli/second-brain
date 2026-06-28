import { clearToken } from '@cerebro/shared/client';
import { ThemeToggle } from '@cerebro/ui';
import { LogOut, PanelLeft, PanelRight, PenLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { QuickCaptureModal } from '../capture/QuickCaptureModal.js';
import { ActiveNotesProvider } from '../notes/active-note-context.js';
import { TabsProvider, useTabs } from '../tabs/tabs-context.js';
import { CommandPalette } from './CommandPalette.js';
import { ExplorerPanel } from './ExplorerPanel.js';
import { PanelDivider } from './PanelDivider.js';
import { QuickSwitcher } from './QuickSwitcher.js';
import { RightPanel } from './RightPanel.js';
import { TabBar } from './TabBar.js';
import { TabContent } from './TabContent.js';
import { useResizablePanel } from './use-resizable-panel.js';

const LEFT_DEFAULT = 248;
const RIGHT_DEFAULT = 280;

/**
 * Ao montar o shell, se NÃO há nenhuma aba aberta, abre "Hoje" — assim o app
 * cai na Agenda (como a home do mobile). Roda uma única vez (ref de guarda):
 * se o usuário depois fechar todas as abas, não reabrimos por cima dele.
 */
function AutoOpenHoje() {
  const { tabs, openTab } = useTabs();
  const { t } = useTranslation();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (tabs.length === 0) {
      openTab({ kind: 'today', id: 'today', title: t('shell.today') });
    }
    // Sem `tabs` nas deps de propósito: só queremos o estado inicial da montagem.
  }, [openTab, t]);

  return null;
}

/**
 * Shell de 3 painéis (estilo Obsidian): explorador (esq) | abas + conteúdo
 * (centro) | painel contextual (dir). Painéis laterais redimensionáveis e
 * colapsáveis, com larguras/estado persistidos em localStorage.
 */
export function Shell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Um único overlay por vez: captura | paleta | switcher. Abrir um fecha os outros.
  const [overlay, setOverlay] = useState<
    'capture' | 'palette' | 'switcher' | null
  >(null);

  const handleLogout = () => {
    clearToken();
    navigate('/login', { replace: true });
  };

  // Atalhos globais. Captura (Cmd/Ctrl+Shift+C) tem que vir antes de Cmd/Ctrl+P
  // porque ambos olham metaKey/ctrlKey — o shift desambigua. Paleta (Cmd/Ctrl+P)
  // e switcher (Cmd/Ctrl+O) chamam preventDefault para não abrir imprimir/abrir
  // do navegador. Abrir qualquer overlay fecha os demais (estado único).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.shiftKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setOverlay('capture');
        return;
      }
      if (!e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setOverlay('palette');
        return;
      }
      if (!e.shiftKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        setOverlay('switcher');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const left = useResizablePanel({
    widthKey: 'web.shell.leftWidth',
    collapsedKey: 'web.shell.leftCollapsed',
    defaultWidth: LEFT_DEFAULT,
    minWidth: 180,
    maxWidth: 420,
    side: 'left',
  });

  const right = useResizablePanel({
    widthKey: 'web.shell.rightWidth',
    collapsedKey: 'web.shell.rightCollapsed',
    defaultWidth: RIGHT_DEFAULT,
    minWidth: 200,
    maxWidth: 480,
    side: 'right',
  });

  return (
    <TabsProvider>
      <AutoOpenHoje />
      <ActiveNotesProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-bg text-fg">
          {!left.collapsed && (
            <>
              <div
                className="flex-shrink-0 overflow-hidden"
                style={{ width: left.width }}
              >
                <ExplorerPanel />
              </div>
              <PanelDivider
                ariaLabel={t('shell.collapsePanel')}
                onPointerDown={left.onDividerPointerDown}
                onDoubleClick={left.resetWidth}
              />
            </>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-10 flex-shrink-0 items-center justify-between border-b border-subtle bg-bg px-2">
              <button
                type="button"
                onClick={left.toggleCollapsed}
                aria-label={
                  left.collapsed
                    ? t('shell.expandPanel')
                    : t('shell.collapsePanel')
                }
                className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-card"
              >
                <PanelLeft size={16} strokeWidth={1.75} />
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOverlay('capture')}
                  aria-label={t('capture.section.input')}
                  title={t('capture.section.input')}
                  className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-card"
                >
                  <PenLine size={16} strokeWidth={1.75} />
                </button>
                <ThemeToggle />
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label={t('nav.logout')}
                  title={t('nav.logout')}
                  className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-card"
                >
                  <LogOut size={16} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={right.toggleCollapsed}
                  aria-label={
                    right.collapsed
                      ? t('shell.expandPanel')
                      : t('shell.collapsePanel')
                  }
                  className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-card"
                >
                  <PanelRight size={16} strokeWidth={1.75} />
                </button>
              </div>
            </header>
            <TabBar />
            <main className="min-h-0 flex-1">
              <TabContent />
            </main>
          </div>

          {!right.collapsed && (
            <>
              <PanelDivider
                ariaLabel={t('shell.collapsePanel')}
                onPointerDown={right.onDividerPointerDown}
                onDoubleClick={right.resetWidth}
              />
              <div
                className="flex-shrink-0 overflow-hidden"
                style={{ width: right.width }}
              >
                <RightPanel />
              </div>
            </>
          )}
        </div>
        <QuickCaptureModal
          open={overlay === 'capture'}
          onClose={() => setOverlay(null)}
        />
        <CommandPalette
          open={overlay === 'palette'}
          onClose={() => setOverlay(null)}
          onOpenCapture={() => setOverlay('capture')}
          onLogout={handleLogout}
        />
        <QuickSwitcher
          open={overlay === 'switcher'}
          onClose={() => setOverlay(null)}
        />
      </ActiveNotesProvider>
    </TabsProvider>
  );
}
