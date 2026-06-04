import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { BottomTabBar, ThemeProvider, ThemeToggle, type Tab } from '@cerebro/ui';
import { LanguageSwitcher } from './components/LanguageSwitcher.js';

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-6">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function WriteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09z" />
      <path d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456z" />
    </svg>
  );
}

function AppShell() {
  const { t } = useTranslation();

  const tabs: Tab[] = [
    { to: '/', icon: <HomeIcon />, label: t('nav.home') },
    { to: '/library', icon: <LibraryIcon />, label: t('nav.library') },
    { to: '/capture', icon: <PlusIcon />, label: t('nav.capture'), isFab: true },
    { to: '/editor', icon: <WriteIcon />, label: t('nav.editor') },
    { to: '/assistant', icon: <SparkleIcon />, label: t('nav.assistant') },
  ];

  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--cerebro-bg)', color: 'var(--cerebro-fg)' }}>
      <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--cerebro-border)' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--cerebro-fg)' }}>
          {t('app.name')}
        </span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex-1 overflow-auto pb-20">
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
