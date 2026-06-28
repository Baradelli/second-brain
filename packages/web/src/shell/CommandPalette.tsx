import { createNote } from '@cerebro/shared/client';
import { useTheme } from '@cerebro/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTour } from '../onboarding/AppTour.js';
import { useTabs } from '../tabs/tabs-context.js';
import { filterCommands } from './command-filter.js';
import { type CommandItem, CommandMenu } from './CommandMenu.js';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Abre o modal de captura rápida (a paleta só dispara; o Shell é dono do estado). */
  onOpenCapture: () => void;
  onLogout: () => void;
}

/**
 * Paleta de comandos (Cmd/Ctrl+P): lista de AÇÕES filtrada por substring no
 * label. Reusa o primitivo `CommandMenu` (toda a mecânica de modal/teclado) e o
 * `filterCommands` puro (ordenação). Cada ação fecha a paleta e dispara seu
 * handler. Rótulos sempre via i18n (`command.*`).
 */
export function CommandPalette({
  open,
  onClose,
  onOpenCapture,
  onLogout,
}: CommandPaletteProps) {
  const { t, i18n } = useTranslation();
  const { openTab } = useTabs();
  const { toggle: toggleTheme } = useTheme();
  const { startTour } = useTour();
  const [query, setQuery] = useState('');

  // Toda ação fecha a paleta antes de rodar — uma só overlay por vez.
  function withClose(fn: () => void): () => void {
    return () => {
      onClose();
      fn();
    };
  }

  async function handleNewNote() {
    // Mesmo default do NotesSection: NOTE/DAY, doc vazio. A aba se auto-titula.
    const note = await createNote({ type: 'NOTE', scope: 'DAY', doc: {} });
    openTab({ kind: 'note', id: note.id, title: t('notes.untitled') });
  }

  const actions: CommandItem[] = [
    {
      id: 'open-today',
      label: t('command.openToday'),
      run: withClose(() =>
        openTab({ kind: 'today', id: 'today', title: t('shell.today') }),
      ),
    },
    {
      id: 'open-review',
      label: t('command.openReview'),
      run: withClose(() =>
        openTab({ kind: 'review', id: 'review', title: t('review.title') }),
      ),
    },
    {
      id: 'open-search',
      label: t('command.openSearch'),
      run: withClose(() =>
        openTab({ kind: 'search', id: 'search', title: t('shell.search') }),
      ),
    },
    {
      id: 'open-calendar',
      label: t('command.openCalendar'),
      run: withClose(() =>
        openTab({
          kind: 'calendar',
          id: 'calendar',
          title: t('shell.calendar'),
        }),
      ),
    },
    {
      id: 'open-recaps',
      label: t('command.openRecaps'),
      run: withClose(() =>
        openTab({ kind: 'recaps', id: 'recaps', title: t('shell.recaps') }),
      ),
    },
    {
      id: 'open-assistant',
      label: t('command.openAssistant'),
      run: withClose(() =>
        openTab({
          kind: 'assistant',
          id: 'assistant',
          title: t('shell.assistant'),
        }),
      ),
    },
    {
      id: 'open-graph',
      label: t('command.openGraph'),
      run: withClose(() =>
        openTab({ kind: 'graph', id: 'graph', title: t('shell.graph') }),
      ),
    },
    {
      id: 'open-labels',
      label: t('command.openLabels'),
      run: withClose(() =>
        openTab({ kind: 'labels', id: 'labels', title: t('labels.title') }),
      ),
    },
    {
      id: 'open-settings',
      label: t('command.openSettings'),
      run: withClose(() =>
        openTab({
          kind: 'settings',
          id: 'settings',
          title: t('shell.settings'),
        }),
      ),
    },
    {
      id: 'open-guide',
      label: t('command.openGuide'),
      run: withClose(startTour),
    },
    {
      id: 'new-note',
      label: t('command.newNote'),
      run: withClose(() => void handleNewNote()),
    },
    {
      id: 'quick-capture',
      label: t('command.quickCapture'),
      run: withClose(onOpenCapture),
    },
    {
      id: 'toggle-theme',
      label: t('command.toggleTheme'),
      run: withClose(toggleTheme),
    },
    {
      id: 'toggle-language',
      label: t('command.toggleLanguage'),
      run: withClose(() => {
        void i18n.changeLanguage(i18n.language === 'pt' ? 'en' : 'pt');
      }),
    },
    {
      id: 'logout',
      label: t('command.logout'),
      run: withClose(onLogout),
    },
  ];

  const items = filterCommands(actions, query);

  return (
    <CommandMenu
      open={open}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      items={items}
      query={query}
      onQueryChange={setQuery}
      placeholder={t('command.placeholder')}
      ariaLabel={t('command.title')}
      emptyLabel={t('command.empty')}
    />
  );
}
