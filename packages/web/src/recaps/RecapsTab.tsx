import type { NoteResponse, RecapScope } from '@cerebro/shared';
import { createRecap, listNotes } from '@cerebro/shared/client';
import { Button, Card, EmptyState, SectionHeader } from '@cerebro/ui';
import { CalendarRange, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';
import {
  RECAP_SCOPES,
  recapPeriodFormat,
  recapTypeKey,
  sortRecapsByDateDesc,
} from './recaps-display.js';

type RecapsByScope = Record<RecapScope, NoteResponse[]>;

const EMPTY_BY_SCOPE: RecapsByScope = { WEEK: [], MONTH: [], YEAR: [] };

/**
 * Aba "Recapitulações" do desktop. Lista os recaps (notas journal de período)
 * agrupados por escopo — Semana / Mês / Ano — e permite criar um novo recap do
 * período atual (`createRecap` acha-ou-cria), abrindo-o numa aba de edição.
 * Reusa os mesmos endpoints (`listNotes`/`createRecap`) e a forma pura de rótulo
 * de período do mobile (sem duplicar lógica). Tom calmo, sem métricas de cobrança.
 */
export function RecapsTab() {
  const { t } = useTranslation();
  const { openTab } = useTabs();

  const [byScope, setByScope] = useState<RecapsByScope>(EMPTY_BY_SCOPE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all(
      RECAP_SCOPES.map((scope) => listNotes({ scope, status: 'ACTIVE' })),
    )
      .then((lists) => {
        if (cancelled) return;
        const map: RecapsByScope = { WEEK: [], MONTH: [], YEAR: [] };
        RECAP_SCOPES.forEach((scope, i) => {
          map[scope] = sortRecapsByDateDesc(lists[i] ?? []);
        });
        setByScope(map);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => refresh(), [refresh]);

  const create = useCallback(
    async (type: 'DEVOTIONAL' | 'REFLECTION', scope: RecapScope) => {
      const note = await createRecap(type, scope);
      openTab({ kind: 'note', id: note.id, title: t(recapTypeKey(type)) });
      refresh();
    },
    [openTab, refresh, t],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('agenda.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('agenda.error')}</p>
      </div>
    );
  }

  return (
    <div className="page-wide h-full overflow-auto px-6 pb-16 sm:px-8">
      <header className="pt-10 pb-7">
        <h1 className="font-display text-4xl font-semibold leading-tight text-fg">
          {t('recaps.title')}
        </h1>
        <p className="font-serif mt-2.5 text-base italic leading-relaxed text-muted">
          {t('dayClosing.subtitle')}
        </p>
      </header>

      <div className="grid gap-x-8 gap-y-9 lg:grid-cols-3">
        {RECAP_SCOPES.map((scope) => (
          <ScopeSection
            key={scope}
            scope={scope}
            recaps={byScope[scope]}
            onCreate={(type) => void create(type, scope)}
            onOpen={(note) =>
              openTab({
                kind: 'note',
                id: note.id,
                title: t(recapTypeKey(note.type)),
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function ScopeSection({
  scope,
  recaps,
  onCreate,
  onOpen,
}: {
  scope: RecapScope;
  recaps: NoteResponse[];
  onCreate: (type: 'DEVOTIONAL' | 'REFLECTION') => void;
  onOpen: (note: NoteResponse) => void;
}) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);

  return (
    <section data-testid={`recap-section-${scope}`}>
      <div className="mb-3 flex items-center justify-between">
        <SectionHeader label={t(`recaps.scope.${scope}`)} />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setCreating((v) => !v)}
          aria-pressed={creating}
          data-testid={`recap-new-${scope}`}
        >
          <Plus size={14} strokeWidth={2.25} />
          {t('recaps.new')}
        </Button>
      </div>

      {creating && (
        <Card padding="sm" className="mb-3">
          <p className="mb-2 text-sm font-semibold text-fg">
            {t('recaps.create.title')}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setCreating(false);
                onCreate('DEVOTIONAL');
              }}
              data-testid={`recap-create-devotional-${scope}`}
            >
              {t('editor.type.devotional')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setCreating(false);
                onCreate('REFLECTION');
              }}
              data-testid={`recap-create-reflection-${scope}`}
            >
              {t('editor.type.reflection')}
            </Button>
          </div>
        </Card>
      )}

      {recaps.length === 0 ? (
        <EmptyState
          icon={<CalendarRange size={20} strokeWidth={1.75} />}
          title={t('recaps.empty')}
        />
      ) : (
        <div className="space-y-2">
          {recaps.map((note) => (
            <RecapRow
              key={note.id}
              note={note}
              scope={scope}
              onOpen={() => onOpen(note)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RecapRow({
  note,
  scope,
  onOpen,
}: {
  note: NoteResponse;
  scope: RecapScope;
  onOpen: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { at } = recapPeriodFormat(note.date, scope);
  const dt = at.setLocale(i18n.language);
  // Rótulo do período localizado (Luxon): semana → "Semana de 15 de jun.";
  // mês → "junho de 2026"; ano → "2026".
  const periodLabel =
    scope === 'WEEK'
      ? t('recaps.weekOf', {
          date: dt.toLocaleString({ day: 'numeric', month: 'short' }),
        })
      : scope === 'MONTH'
        ? dt.toLocaleString({ month: 'long', year: 'numeric' })
        : dt.toFormat('yyyy');

  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`recap-${note.id}`}
      className="w-full text-left"
    >
      <Card padding="sm">
        <p className="text-sm font-medium capitalize text-fg">{periodLabel}</p>
        <p className="text-xs text-muted">{t(recapTypeKey(note.type))}</p>
      </Card>
    </button>
  );
}
