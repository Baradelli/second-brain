import type { LabelNodeResponse } from '@cerebro/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { listLabels } from '../lib/api/endpoints.js';

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
  return out;
}

interface LabelFilterProps {
  value: string | null; // labelId selecionado, ou null = todas
  onChange: (labelId: string | null) => void;
}

/** Filtro por label (seleção única + "Todas"). Carrega sozinho; some se não há labels. */
export function LabelFilter({ value, onChange }: LabelFilterProps) {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<FlatLabel[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tree = await listLabels();
        if (!cancelled) setLabels(flatten(tree));
      } catch {
        /* sem labels — não mostra o filtro */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (labels.length === 0) return null;

  function chipStyle(active: boolean, color?: string | null) {
    return {
      backgroundColor: active
        ? (color ?? 'var(--cerebro-accent-soft)')
        : 'transparent',
      color: active
        ? color
          ? '#fff'
          : 'var(--cerebro-accent)'
        : 'var(--cerebro-muted)',
      border: active
        ? '1px solid transparent'
        : '1px solid var(--cerebro-border)',
    };
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2" data-testid="label-filter">
      <button
        type="button"
        onClick={() => onChange(null)}
        data-testid="label-filter-all"
        className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
        style={chipStyle(value === null)}
      >
        {t('labels.filterAll')}
      </button>
      {labels.map((l) => {
        const active = value === l.id;
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(active ? null : l.id)}
            data-testid={`label-filter-${l.id}`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            style={chipStyle(active, l.color)}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: l.color ?? 'var(--cerebro-border)' }}
              aria-hidden
            />
            {l.name}
          </button>
        );
      })}
    </div>
  );
}
