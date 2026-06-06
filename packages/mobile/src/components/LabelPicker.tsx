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

interface LabelPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
}

/** Multi-seleção de labels da árvore. Carrega sozinho; falha vira lista vazia. */
export function LabelPicker({ value, onChange }: LabelPickerProps) {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<FlatLabel[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tree = await listLabels();
        if (!cancelled) setLabels(flatten(tree));
      } catch {
        /* sem labels disponíveis — degrada para lista vazia */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
      >
        {t('labels.pick')}
      </span>
      {labels.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--cerebro-muted)' }}>
          {t('labels.pickEmpty')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" data-testid="label-picker">
          {labels.map((l) => {
            const active = value.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => toggle(l.id)}
                data-testid={`pick-label-${l.id}`}
                aria-pressed={active}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: active
                    ? (l.color ?? 'var(--cerebro-accent-soft)')
                    : 'transparent',
                  color: active
                    ? l.color
                      ? '#fff'
                      : 'var(--cerebro-accent)'
                    : 'var(--cerebro-muted)',
                  border: active
                    ? '1px solid transparent'
                    : '1px solid var(--cerebro-border)',
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: l.color ?? 'var(--cerebro-border)',
                  }}
                  aria-hidden
                />
                {l.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
