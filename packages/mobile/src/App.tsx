import {
  BottomSheet,
  BottomTabBar,
  type Tab,
  ThemeProvider,
  ThemeToggle,
} from '@cerebro/ui';
import { BookOpen, Home, PenLine, Plus, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from './components/LanguageSwitcher.js';
import { startOfflineSync } from './lib/offline/index.js';

const NOTE_TYPES = [
  {
    type: 'DEVOTIONAL',
    labelKey: 'editor.type.devotional',
    color: 'var(--cerebro-devotional)',
  },
  {
    type: 'REFLECTION',
    labelKey: 'editor.type.reflection',
    color: 'var(--cerebro-reflection)',
  },
  {
    type: 'STUDY_NOTE',
    labelKey: 'editor.type.study',
    color: 'var(--cerebro-study)',
  },
  { type: 'NOTE', labelKey: 'editor.type.note', color: 'var(--cerebro-note)' },
] as const;

function AppShell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [writeOpen, setWriteOpen] = useState(false);

  // Sincroniza a fila offline (captura/escrita) ao reconectar e ao abrir o app.
  useEffect(() => {
    startOfflineSync();
  }, []);

  function startWriting(type: string) {
    setWriteOpen(false);
    navigate(`/editor?type=${type}`);
  }

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
      icon: <PenLine size={20} strokeWidth={1.75} />,
      label: t('nav.editor'),
      onSelect: () => setWriteOpen(true),
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

      <BottomSheet open={writeOpen} onClose={() => setWriteOpen(false)}>
        <p
          className="mb-4 font-display text-lg font-semibold"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('editor.chooseType')}
        </p>
        <div className="flex flex-col gap-2">
          {NOTE_TYPES.map(({ type, labelKey, color }) => (
            <button
              key={type}
              type="button"
              onClick={() => startWriting(type)}
              data-testid={`write-type-${type}`}
              className="flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3.5 transition-all duration-150 active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--cerebro-raised)',
                border: '1px solid var(--cerebro-border)',
              }}
            >
              <span
                className="h-7 w-1 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--cerebro-fg)' }}
              >
                {t(labelKey)}
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>
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
