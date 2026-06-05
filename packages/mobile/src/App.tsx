import {
  BottomTabBar,
  type Tab,
  ThemeProvider,
  ThemeToggle,
} from '@cerebro/ui';
import { BookOpen, Home, PenLine, Plus, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { LanguageSwitcher } from './components/LanguageSwitcher.js';
import { startOfflineSync } from './lib/offline/index.js';

function AppShell() {
  const { t } = useTranslation();

  // Sincroniza a fila offline (captura/escrita) ao reconectar e ao abrir o app.
  useEffect(() => {
    startOfflineSync();
  }, []);

  const tabs: Tab[] = [
    {
      to: '/',
      icon: <Home size={20} strokeWidth={1.75} />,
      label: t('nav.home'),
    },
    {
      to: '/library',
      icon: <BookOpen size={20} strokeWidth={1.75} />,
      label: t('nav.library'),
    },
    {
      to: '/capture',
      icon: <Plus size={26} strokeWidth={2} />,
      label: t('nav.capture'),
      isFab: true,
    },
    {
      to: '/editor',
      icon: <PenLine size={20} strokeWidth={1.75} />,
      label: t('nav.editor'),
    },
    {
      to: '/assistant',
      icon: <Sparkles size={20} strokeWidth={1.75} />,
      label: t('nav.assistant'),
    },
  ];

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{
        backgroundColor: 'var(--cerebro-bg)',
        color: 'var(--cerebro-fg)',
      }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-5 py-3"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--cerebro-bg) 82%, transparent)',
          borderBottom: '1px solid var(--cerebro-border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <span
          className="flex items-center gap-2 font-display text-base font-semibold"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--cerebro-accent)' }}
            aria-hidden
          />
          {t('app.name')}
        </span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 overflow-auto pb-24">
        <Outlet />
      </div>

      <BottomTabBar tabs={tabs} />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
