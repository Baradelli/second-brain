import type { LabelNodeResponse } from '@cerebro/shared';
import { listLabels } from '@cerebro/shared/client';
import { EmptyState } from '@cerebro/ui';
import { Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';

interface FlatLabel {
  id: string;
  name: string;
  color: string | null;
}

function flatten(nodes: LabelNodeResponse[]): FlatLabel[] {
  const out: FlatLabel[] = [];
  const walk = (list: LabelNodeResponse[]) => {
    for (const n of list) {
      out.push({ id: n.id, name: n.name, color: n.color });
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/**
 * Seção "Labels" do explorador. Lista as labels (cor + nome) e oferece "Gerenciar
 * labels", que abre a aba de gestão (criar/editar/arquivar). Clicar numa label
 * também abre a gestão. Reusa `listLabels` do shared.
 */
export function LabelsSection() {
  const { t } = useTranslation();
  const { openTab } = useTabs();
  const [labels, setLabels] = useState<FlatLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listLabels()
      .then((tree) => {
        if (!cancelled) setLabels(flatten(tree));
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

  function openManage() {
    openTab({ kind: 'labels', id: 'labels', title: t('labels.title') });
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={openManage}
        data-testid="manage-labels"
        className="mb-1 flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-accent transition-colors hover:bg-card"
      >
        <Settings2 size={15} strokeWidth={2} />
        <span className="truncate">{t('labels.manage')}</span>
      </button>

      {loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
      )}

      {error && !loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('labels.error')}</p>
      )}

      {!loading && !error && labels.length === 0 && (
        <EmptyState title={t('labels.empty')} className="py-6" />
      )}

      {!loading && !error && labels.length > 0 && (
        <ul className="flex flex-col">
          {labels.map((label) => (
            <li key={label.id}>
              <button
                type="button"
                onClick={openManage}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: label.color ?? 'transparent',
                    border: label.color
                      ? 'none'
                      : '1px solid var(--cerebro-border)',
                  }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {label.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
