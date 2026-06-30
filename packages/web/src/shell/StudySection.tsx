import type { StudyItemResponse } from '@cerebro/shared';
import { createStudyItem, listStudyItems } from '@cerebro/shared/client';
import { EmptyState } from '@cerebro/ui';
import { Brain, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ArchivedToggle } from '../shared/ArchivedToggle.js';
import { scheduleHint, studyItemLabel } from '../study/study-display.js';
import { useTabs } from '../tabs/tabs-context.js';

/**
 * Lista de itens de estudo dentro da seção "Estudo" do explorador. Busca os
 * itens ativos, mostra título + uma dica de agendamento (revisar/atrasada/
 * consolidado/próxima — derivada do `schedule` que o BACKEND calcula, nunca
 * recomputada aqui), abre o item numa aba ao clicar e oferece "Novo item de
 * estudo" (cria com o default do mobile e abre a aba). Espelha `GoalsSection`.
 */
export function StudySection() {
  const { t, i18n } = useTranslation();
  const { openTab } = useTabs();
  const [items, setItems] = useState<StudyItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listStudyItems({ status: 'ACTIVE' })
      .then((data) => {
        if (!cancelled) setItems(data);
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

  function open(item: Pick<StudyItemResponse, 'id' | 'title'>) {
    openTab({
      kind: 'studyItem',
      id: item.id,
      title: studyItemLabel(item, t('study.fromResource')),
    });
  }

  async function handleNew() {
    if (creating) return;
    setCreating(true);
    try {
      // Default do mobile (StudyItemForm): título placeholder, sem recurso.
      const item = await createStudyItem({ title: t('study.create.title') });
      setItems((prev) => [item, ...prev]);
      open(item);
    } catch {
      setError(true);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => void handleNew()}
        disabled={creating}
        className="mb-1 flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-accent transition-colors hover:bg-card disabled:opacity-50"
      >
        <Plus size={15} strokeWidth={2} />
        <span className="truncate">{t('study.new')}</span>
      </button>

      {loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
      )}

      {error && !loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('study.error')}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState title={t('study.empty')} className="py-6" />
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => open(item)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card"
              >
                <Brain
                  size={15}
                  strokeWidth={1.75}
                  className="shrink-0 text-muted"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {studyItemLabel(item, t('study.fromResource'))}
                  </span>
                  <ScheduleLabel item={item} lang={i18n.language} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ArchivedToggle
        labels={{
          show: t('study.archived.show'),
          hide: t('study.archived.hide'),
          empty: t('study.archived.empty'),
        }}
        load={async () =>
          (await listStudyItems({ status: 'ARCHIVED' })).map((item) => ({
            id: item.id,
            title: studyItemLabel(item, t('study.fromResource')),
          }))
        }
        onOpen={(id) =>
          openTab({ kind: 'studyItem', id, title: t('study.fromResource') })
        }
      />
    </div>
  );
}

/** Dica de agendamento (revisar/atrasada/consolidado/próxima data) por item. */
function ScheduleLabel({
  item,
  lang,
}: {
  item: StudyItemResponse;
  lang: string;
}) {
  const { t } = useTranslation();
  const hint = scheduleHint(item.schedule);
  const toneClass =
    hint.tone === 'overdue'
      ? 'text-error'
      : hint.tone === 'due'
        ? 'text-accent'
        : 'text-faint';

  const label =
    hint.kind === 'next'
      ? t('study.schedule.next', {
          date: item.schedule.nextRecallAt
            ? new Date(item.schedule.nextRecallAt).toLocaleDateString(lang, {
                day: 'numeric',
                month: 'short',
              })
            : '—',
        })
      : t(
          `study.schedule.${hint.kind === 'consolidated' ? 'consolidated' : hint.kind === 'overdue' ? 'overdue' : 'dueToday'}`,
        );

  return (
    <span
      className={`block truncate text-[0.625rem] uppercase tracking-[0.12em] ${toneClass}`}
    >
      {label}
    </span>
  );
}
