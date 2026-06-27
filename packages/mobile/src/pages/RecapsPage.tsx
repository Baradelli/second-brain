import type { NoteResponse, RecapScope } from '@cerebro/shared';
import { BottomSheet, Card, EmptyState } from '@cerebro/ui';
import { CalendarRange, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { PublishTrigger } from '../components/PublishTrigger.js';
import { createRecap, listNotes } from '../lib/api/endpoints.js';

const SCOPES: RecapScope[] = ['WEEK', 'MONTH', 'YEAR'];

function recapPeriodLabel(
  note: NoteResponse,
  scope: RecapScope,
  locale: string,
  weekOf: (d: string) => string,
): string {
  const d = new Date(note.date);
  if (scope === 'WEEK')
    return weekOf(
      d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    );
  if (scope === 'MONTH')
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return d.toLocaleDateString(locale, { year: 'numeric' });
}

export function RecapsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [byScope, setByScope] = useState<Record<string, NoteResponse[]>>({});
  const [loading, setLoading] = useState(true);
  const [creatingScope, setCreatingScope] = useState<RecapScope | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(SCOPES.map((scope) => listNotes({ scope, status: 'ACTIVE' })))
      .then((lists) => {
        if (cancelled) return;
        const map: Record<string, NoteResponse[]> = {};
        SCOPES.forEach((scope, i) => {
          map[scope] = (lists[i] ?? []).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        });
        setByScope(map);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(type: 'DEVOTIONAL' | 'REFLECTION') {
    if (!creatingScope) return;
    const note = await createRecap(type, creatingScope);
    setCreatingScope(null);
    navigate(`/editor/${note.id}`);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <h1
        className="mb-5 font-display text-[1.75rem] font-semibold leading-tight"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('recaps.title')}
      </h1>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.loading')}
        </p>
      )}

      {!loading && (
        <div className="space-y-6">
          {SCOPES.map((scope) => {
            const items = byScope[scope] ?? [];
            return (
              <section key={scope} data-testid={`recap-section-${scope}`}>
                <div className="mb-2 flex items-center justify-between">
                  <h2
                    className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
                    style={{ color: 'var(--cerebro-muted)' }}
                  >
                    {t(`recaps.scope.${scope}`)}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCreatingScope(scope)}
                    data-testid={`recap-new-${scope}`}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--cerebro-accent-soft)',
                      color: 'var(--cerebro-accent)',
                    }}
                  >
                    <Plus size={14} strokeWidth={2.25} />
                    {t('recaps.new')}
                  </button>
                </div>

                {items.length === 0 ? (
                  <EmptyState
                    icon={<CalendarRange size={20} strokeWidth={1.75} />}
                    title={t('recaps.empty')}
                  />
                ) : (
                  <div className="space-y-2">
                    {items.map((note) => {
                      const periodLabel = recapPeriodLabel(
                        note,
                        scope,
                        i18n.language,
                        (d) => t('recaps.weekOf', { date: d }),
                      );
                      return (
                        <Card key={note.id} padding="sm">
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/editor/${note.id}`)}
                              data-testid={`recap-${note.id}`}
                              className="min-w-0 flex-1 text-left"
                            >
                              <p
                                className="text-sm font-medium capitalize"
                                style={{ color: 'var(--cerebro-fg)' }}
                              >
                                {periodLabel}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: 'var(--cerebro-muted)' }}
                              >
                                {t(
                                  note.type === 'DEVOTIONAL'
                                    ? 'editor.type.devotional'
                                    : 'editor.type.reflection',
                                )}
                              </p>
                            </button>
                            <PublishTrigger
                              compact
                              source={{
                                type: 'recap',
                                id: note.id,
                                title: periodLabel,
                              }}
                            />
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <BottomSheet
        open={creatingScope !== null}
        onClose={() => setCreatingScope(null)}
      >
        <h2
          className="mb-4 font-display text-lg font-semibold"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('recaps.create.title')}
        </h2>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void handleCreate('DEVOTIONAL')}
            data-testid="recap-create-devotional"
            className="rounded-[var(--radius-card)] px-4 py-3 text-left text-sm font-semibold"
            style={{
              backgroundColor: 'var(--cerebro-raised)',
              border: '1px solid var(--cerebro-border)',
              color: 'var(--cerebro-fg)',
            }}
          >
            {t('editor.type.devotional')}
          </button>
          <button
            type="button"
            onClick={() => void handleCreate('REFLECTION')}
            data-testid="recap-create-reflection"
            className="rounded-[var(--radius-card)] px-4 py-3 text-left text-sm font-semibold"
            style={{
              backgroundColor: 'var(--cerebro-raised)',
              border: '1px solid var(--cerebro-border)',
              color: 'var(--cerebro-fg)',
            }}
          >
            {t('editor.type.reflection')}
          </button>
        </div>
      </BottomSheet>
    </main>
  );
}
