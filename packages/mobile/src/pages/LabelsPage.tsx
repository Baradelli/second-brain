import type { LabelNodeResponse } from '@cerebro/shared';
import {
  archiveLabel,
  createLabel,
  editLabel,
  type LabelBody,
  listLabels,
} from '@cerebro/shared/client';
import { BottomSheet, Button } from '@cerebro/ui';
import { Archive, Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LabelForm } from '../components/LabelForm.js';

interface FlatLabel {
  id: string;
  name: string;
  color: string | null;
}

// Labels são planas — achatamos a árvore (compat. com dados antigos aninhados).
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

type Sheet = { mode: 'create' } | { mode: 'edit'; label: FlatLabel };

export function LabelsPage() {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<FlatLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiveError, setArchiveError] = useState(false);

  async function load() {
    setError(false);
    setLabels(flatten(await listLabels()));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
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

  async function handleSubmit(body: LabelBody) {
    if (!sheet) return;
    setSaving(true);
    try {
      if (sheet.mode === 'create') {
        await createLabel({ name: body.name, color: body.color });
      } else {
        await editLabel(sheet.label.id, { name: body.name, color: body.color });
      }
      setSheet(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string) {
    setArchiveError(false);
    try {
      await archiveLabel(id);
      await load();
    } catch {
      setArchiveError(true);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <div className="mb-5 flex items-center justify-between">
        <h1
          className="font-display text-[1.75rem] font-semibold leading-tight"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('labels.title')}
        </h1>
        <Button
          size="sm"
          onClick={() => setSheet({ mode: 'create' })}
          data-testid="new-label-button"
        >
          <Plus size={16} strokeWidth={2.25} />
          {t('labels.new')}
        </Button>
      </div>

      {archiveError && (
        <p className="mb-3 text-xs" style={{ color: 'var(--cerebro-error)' }}>
          {t('labels.archiveBlocked')}
        </p>
      )}

      {loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.loading')}
        </p>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('labels.error')}
        </p>
      )}

      {!loading && !error && labels.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('labels.empty')}
        </p>
      )}

      {!loading && !error && labels.length > 0 && (
        <div data-testid="labels-list" className="flex flex-col gap-1">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-2 rounded-[var(--radius-card)] py-2"
              data-testid={`label-row-${label.id}`}
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
              <span
                className="flex-1 truncate text-sm font-medium"
                style={{ color: 'var(--cerebro-fg)' }}
              >
                {label.name}
              </span>
              <RowAction
                label={t('labels.edit')}
                testId={`edit-${label.id}`}
                onClick={() => setSheet({ mode: 'edit', label })}
              >
                <Pencil size={15} strokeWidth={1.85} />
              </RowAction>
              <RowAction
                label={t('common.archive')}
                testId={`archive-${label.id}`}
                onClick={() => handleArchive(label.id)}
              >
                <Archive size={15} strokeWidth={1.85} />
              </RowAction>
            </div>
          ))}
        </div>
      )}

      <BottomSheet open={sheet !== null} onClose={() => setSheet(null)}>
        {sheet && (
          <LabelForm
            submitting={saving}
            onSubmit={handleSubmit}
            initial={
              sheet.mode === 'edit'
                ? { name: sheet.label.name, color: sheet.label.color }
                : undefined
            }
          />
        )}
      </BottomSheet>
    </main>
  );
}

function RowAction({
  label,
  testId,
  onClick,
  children,
}: {
  label: string;
  testId: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={testId}
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
      style={{ color: 'var(--cerebro-muted)' }}
    >
      {children}
    </button>
  );
}
