import type {
  CaptureResponse,
  NoteResponse,
  ResourceResponse,
  SearchResultResponse,
} from '@cerebro/shared';
import { Card, EmptyState } from '@cerebro/ui';
import { BookOpen, Inbox, NotebookText, Search } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getSearch } from '../lib/api/endpoints.js';

function noteLabel(n: NoteResponse): string {
  return (
    n.title?.trim() ||
    n.plainText
      .split('\n')
      .find((l) => l.trim())
      ?.trim() ||
    ''
  );
}

export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
        .catch(() => setResult({ notes: [], resources: [], captures: [] }))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const total = result
    ? result.notes.length + result.resources.length + result.captures.length
    : 0;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <h1
        className="mb-4 font-display text-[1.75rem] font-semibold leading-tight"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('search.title')}
      </h1>

      <div className="relative mb-5">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--cerebro-faint)' }}
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
          className="h-11 w-full rounded-[var(--radius-card)] pl-10 pr-4 text-sm outline-none"
          style={{
            backgroundColor: 'var(--cerebro-raised)',
            color: 'var(--cerebro-fg)',
            border: '1px solid var(--cerebro-border)',
          }}
        />
      </div>

      {!query.trim() && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('search.hint')}
        </p>
      )}

      {loading && query.trim() && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.loading')}
        </p>
      )}

      {!loading && result && total === 0 && query.trim() && (
        <EmptyState
          icon={<Search size={20} strokeWidth={1.75} />}
          title={t('search.empty')}
        />
      )}

      {!loading && result && total > 0 && (
        <div className="space-y-6" data-testid="search-results">
          <Section
            title={t('search.section.notes')}
            count={result.notes.length}
          >
            {result.notes.map((n) => (
              <Row
                key={n.id}
                icon={<NotebookText size={16} strokeWidth={1.75} />}
                title={noteLabel(n) || t('notes.untitled')}
                onClick={() => navigate(`/editor/${n.id}`)}
                testId={`search-note-${n.id}`}
              />
            ))}
          </Section>

          <Section
            title={t('search.section.resources')}
            count={result.resources.length}
          >
            {result.resources.map((r: ResourceResponse) => (
              <Row
                key={r.id}
                icon={<BookOpen size={16} strokeWidth={1.75} />}
                title={r.title}
                subtitle={t(`resource.type.${r.type}`)}
                onClick={() => navigate(`/library/${r.id}`)}
                testId={`search-resource-${r.id}`}
              />
            ))}
          </Section>

          <Section
            title={t('search.section.captures')}
            count={result.captures.length}
          >
            {result.captures.map((c: CaptureResponse) => (
              <Row
                key={c.id}
                icon={<Inbox size={16} strokeWidth={1.75} />}
                title={c.text}
                onClick={() => navigate('/review')}
                testId={`search-capture-${c.id}`}
              />
            ))}
          </Section>
        </div>
      )}
    </main>
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
      <h2
        className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--cerebro-muted)' }}
      >
        {title} · {count}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({
  icon,
  title,
  subtitle,
  onClick,
  testId,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="w-full text-left"
    >
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'var(--cerebro-accent-soft)',
              color: 'var(--cerebro-accent)',
            }}
            aria-hidden
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-medium"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {title}
            </p>
            {subtitle && (
              <p
                className="truncate text-xs"
                style={{ color: 'var(--cerebro-muted)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </Card>
    </button>
  );
}
