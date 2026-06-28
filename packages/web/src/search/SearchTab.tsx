import type { SearchResultResponse } from '@cerebro/shared';
import { getSearch } from '@cerebro/shared/client';
import { Card, EmptyState } from '@cerebro/ui';
import { BookOpen, Inbox, NotebookText, Search } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';
import type { TabDescriptor } from '../tabs/tabs-reducer.js';
import { searchResultsToGroups,type SearchRow } from './search-groups.js';

const EMPTY: SearchResultResponse = { notes: [], resources: [], captures: [] };

/**
 * Aba Busca (desktop): a contraparte persistente do quick switcher (Cmd+O). Campo
 * de busca → `getSearch` debounced (300ms, mesma cadência do switcher e do mobile)
 * → resultados agrupados por tipo (notas / biblioteca / capturas), como a
 * SearchPage do mobile.
 *
 * Clicar numa linha abre a aba do item. O destino vem do helper puro
 * `searchResultsToGroups`, que reusa `search-to-tab.ts` — então a aba Busca e o
 * switcher concordam exatamente sobre o que cada resultado abre. Capturas não têm
 * aba própria (`tab === null`): aparecem listadas, mas não são clicáveis.
 */
export function SearchTab() {
  const { t } = useTranslation();
  const { openTab } = useTabs();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResultResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      getSearch(q)
        .then(setResult)
        .catch(() => setResult(EMPTY))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const groups = result
    ? searchResultsToGroups(result, t('notes.untitled'))
    : null;
  const trimmed = query.trim();

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col overflow-y-auto px-6 py-6">
      <h1 className="font-display text-2xl font-semibold text-fg">
        {t('search.title')}
      </h1>

      <div className="relative mt-5">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          aria-hidden
        >
          <Search size={18} strokeWidth={1.85} />
        </span>
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.title')}
          data-testid="search-input"
          className="h-11 w-full rounded-[var(--radius-card)] border border-subtle bg-raised pl-10 pr-4 text-sm text-fg outline-none"
        />
      </div>

      {!trimmed && (
        <p className="mt-5 text-sm text-muted">{t('search.hint')}</p>
      )}

      {loading && trimmed && (
        <p className="mt-5 text-sm text-muted">{t('agenda.loading')}</p>
      )}

      {!loading && groups && groups.total === 0 && trimmed && (
        <div className="mt-5">
          <EmptyState
            icon={<Search size={20} strokeWidth={1.75} />}
            title={t('search.empty')}
          />
        </div>
      )}

      {!loading && groups && groups.total > 0 && (
        <div className="mt-6 flex flex-col gap-6" data-testid="search-results">
          <Section
            title={t('search.section.notes')}
            count={groups.notes.length}
          >
            {groups.notes.map((row) => (
              <Row
                key={row.id}
                icon={<NotebookText size={16} strokeWidth={1.75} />}
                row={row}
                onOpen={openTab}
                testId={`search-note-${row.id}`}
              />
            ))}
          </Section>

          <Section
            title={t('search.section.resources')}
            count={groups.resources.length}
          >
            {groups.resources.map((row) => (
              <Row
                key={row.id}
                icon={<BookOpen size={16} strokeWidth={1.75} />}
                row={row}
                onOpen={openTab}
                testId={`search-resource-${row.id}`}
              />
            ))}
          </Section>

          <Section
            title={t('search.section.captures')}
            count={groups.captures.length}
          >
            {groups.captures.map((row) => (
              <Row
                key={row.id}
                icon={<Inbox size={16} strokeWidth={1.75} />}
                row={row}
                onOpen={openTab}
                testId={`search-capture-${row.id}`}
              />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
        {title} · {count}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

/**
 * Uma linha de resultado. Se a linha abre uma aba (`row.tab`), é um botão; se não
 * (capturas), é estática — a captura vive na fila de revisão, não tem aba própria.
 */
function Row({
  icon,
  row,
  onOpen,
  testId,
}: {
  icon: ReactNode;
  row: SearchRow;
  onOpen: (descriptor: TabDescriptor) => void;
  testId: string;
}) {
  const inner = (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--cerebro-accent-soft)] text-accent"
          aria-hidden
        >
          {icon}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
          {row.title}
        </p>
      </div>
    </Card>
  );

  if (!row.tab) {
    return (
      <div data-testid={testId} className="opacity-80">
        {inner}
      </div>
    );
  }

  const tab = row.tab;
  return (
    <button
      type="button"
      onClick={() => onOpen(tab)}
      data-testid={testId}
      className="w-full text-left"
    >
      {inner}
    </button>
  );
}
