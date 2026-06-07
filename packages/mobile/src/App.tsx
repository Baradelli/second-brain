import {
  BottomTabBar,
  Sidebar,
  type SidebarItem,
  type Tab,
  ThemeProvider,
  ThemeToggle,
} from '@cerebro/ui';
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  Home,
  Menu,
  NotebookText,
  Plus,
  Search,
  Tags,
  Target,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from './components/LanguageSwitcher.js';
import { startOfflineSync } from './lib/offline/index.js';

function AppShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Sincroniza a fila offline (captura/escrita) ao reconectar e ao abrir o app.
  useEffect(() => {
    startOfflineSync();
  }, []);

  // Footer flutuante: só os atalhos principais (Início · Capturar · Calendário).
  const tabs: Tab[] = [
    {
      to: '/',
      icon: <Home size={20} strokeWidth={1.75} />,
      label: t('nav.home'),
    },
    {
      to: '/capture',
      icon: <Plus size={26} strokeWidth={2} />,
      label: t('nav.capture'),
      isFab: true,
    },
    {
      to: '/calendar',
      icon: <CalendarDays size={20} strokeWidth={1.75} />,
      label: t('nav.calendar'),
    },
  ];

  // Demais seções moram no sidebar (cresce conforme o app ganha páginas).
  const menuItems: SidebarItem[] = [
    { to: '/', icon: <Home size={18} strokeWidth={1.75} />, label: t('nav.home') },
    {
      to: '/search',
      icon: <Search size={18} strokeWidth={1.75} />,
      label: t('nav.search'),
    },
    {
      to: '/library',
      icon: <BookOpen size={18} strokeWidth={1.75} />,
      label: t('nav.library'),
    },
    {
      to: '/goals',
      icon: <Target size={18} strokeWidth={1.75} />,
      label: t('nav.goals'),
    },
    {
      to: '/notes',
      icon: <NotebookText size={18} strokeWidth={1.75} />,
      label: t('nav.notes'),
    },
    {
      to: '/calendar',
      icon: <CalendarDays size={18} strokeWidth={1.75} />,
      label: t('nav.calendar'),
    },
    {
      to: '/recaps',
      icon: <CalendarRange size={18} strokeWidth={1.75} />,
      label: t('nav.recaps'),
    },
    {
      to: '/labels',
      icon: <Tags size={18} strokeWidth={1.75} />,
      label: t('labels.title'),
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.menu')}
            data-testid="menu-button"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--cerebro-accent-soft)]"
            style={{ color: 'var(--cerebro-muted)' }}
          >
            <Menu size={20} strokeWidth={1.85} />
          </button>
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
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate('/search')}
            aria-label={t('nav.search')}
            data-testid="search-button"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--cerebro-accent-soft)]"
            style={{ color: 'var(--cerebro-muted)' }}
          >
            <Search size={18} strokeWidth={1.85} />
          </button>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 overflow-auto pb-28">
        <Outlet />
      </div>

      <Sidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        items={menuItems}
        title={t('app.name')}
      />
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
