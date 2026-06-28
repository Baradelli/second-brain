import type { SearchResultResponse } from '@cerebro/shared';
import { getSearch } from '@cerebro/shared/client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';
import type { TabDescriptor } from '../tabs/tabs-reducer.js';
import { type CommandItem, CommandMenu } from './CommandMenu.js';
import { searchResultsToTabs } from './search-to-tab.js';

interface QuickSwitcherProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY: SearchResultResponse = { notes: [], resources: [], captures: [] };

/**
 * Quick switcher (Cmd/Ctrl+O): conforme o usuário digita, faz busca debounced
 * (`getSearch`) e mostra os resultados como itens abríveis. Cada resultado vira
 * uma aba pelo helper puro `searchResultsToTabs` (notas → aba note; recursos →
 * aba resource placeholder; capturas são puladas). Reusa o `CommandMenu`.
 */
export function QuickSwitcher({ open, onClose }: QuickSwitcherProps) {
  const { t } = useTranslation();
  const { openTab } = useTabs();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResultResponse | null>(null);

  // Limpa o estado ao fechar para a próxima abertura começar do zero.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResult(null);
    }
  }, [open]);

  // Busca debounced — mesma cadência do SearchPage do mobile (300ms).
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResult(null);
      return;
    }
    const id = setTimeout(() => {
      getSearch(q)
        .then(setResult)
        .catch(() => setResult(EMPTY));
    }, 300);
    return () => clearTimeout(id);
  }, [query, open]);

  function close() {
    onClose();
  }

  const tabs: TabDescriptor[] = result
    ? searchResultsToTabs(result, t('notes.untitled'))
    : [];

  const items: CommandItem[] = tabs.map((tab) => ({
    id: `${tab.kind}:${tab.id}`,
    label: tab.title,
    hint: t(`search.section.${tab.kind === 'note' ? 'notes' : 'resources'}`),
    run: () => {
      close();
      openTab(tab);
    },
  }));

  const emptyLabel = query.trim()
    ? t('command.empty')
    : t('command.switcher.hint');

  return (
    <CommandMenu
      open={open}
      onClose={close}
      items={items}
      query={query}
      onQueryChange={setQuery}
      placeholder={t('command.switcher.placeholder')}
      ariaLabel={t('command.switcher.title')}
      emptyLabel={emptyLabel}
    />
  );
}
