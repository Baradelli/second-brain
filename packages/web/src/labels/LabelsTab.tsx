import type { LabelNodeResponse } from '@cerebro/shared';
import {
  archiveLabel,
  createLabel,
  editLabel,
  type LabelBody,
  listLabels,
} from '@cerebro/shared/client';
import { Button, Card, EmptyState } from '@cerebro/ui';
import { Archive, Pencil, Plus, Tag } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LabelForm } from './LabelForm.js';

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

type Editor = { mode: 'create' } | { mode: 'edit'; label: FlatLabel };

/**
 * Aba de gestão de Labels do desktop. Espelha o `LabelsPage` do mobile (listar /
 * criar / editar / arquivar, com seletor de cor) e reusa os mesmos endpoints de
 * `@cerebro/shared/client`. O formulário aparece inline num cartão (padrão do
 * web), em vez do bottom-sheet do mobile. Arquivar bloqueado mostra o aviso.
 */
export function LabelsTab() {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<FlatLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiveError, setArchiveError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    setLabels(flatten(await listLabels()));
  }, []);

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
  }, [load]);

  async function handleSubmit(body: LabelBody) {
    if (!editor) return;
    setSaving(true);
    try {
      if (editor.mode === 'create') {
        await createLabel({ name: body.name, color: body.color });
      } else {
        await editLabel(editor.label.id, {
          name: body.name,
          color: body.color,
        });
      }
      setEditor(null);
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
    <div className="page-reading h-full overflow-auto px-6 pb-16 sm:px-8">
      <header className="flex items-center justify-between pt-10 pb-6">
        <h1 className="font-display text-3xl font-semibold leading-tight text-fg">
          {t('labels.title')}
        </h1>
        <Button
          size="sm"
          onClick={() => setEditor({ mode: 'create' })}
          data-testid="new-label-button"
        >
          <Plus size={16} strokeWidth={2.25} />
          {t('labels.new')}
        </Button>
      </header>

      {editor && (
        <Card className="mb-5">
          <LabelForm
            submitting={saving}
            onSubmit={handleSubmit}
            onCancel={() => setEditor(null)}
            initial={
              editor.mode === 'edit'
                ? { name: editor.label.name, color: editor.label.color }
                : undefined
            }
          />
        </Card>
      )}

      {archiveError && (
        <p className="mb-3 text-xs text-error" role="alert">
          {t('labels.archiveBlocked')}
        </p>
      )}

      {loading && <p className="text-sm text-muted">{t('agenda.loading')}</p>}

      {error && !loading && (
        <p className="text-sm text-muted">{t('labels.error')}</p>
      )}

      {!loading && !error && labels.length === 0 && !editor && (
        <EmptyState
          icon={<Tag size={20} strokeWidth={1.75} />}
          title={t('labels.empty')}
          className="mt-8"
        />
      )}

      {!loading && !error && labels.length > 0 && (
        <div data-testid="labels-list" className="flex flex-col">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 rounded-[var(--radius-card)] px-2 py-2 transition-colors hover:bg-card"
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
              <span className="flex-1 truncate text-sm font-medium text-fg">
                {label.name}
              </span>
              <RowAction
                label={t('labels.edit')}
                testId={`edit-${label.id}`}
                onClick={() => setEditor({ mode: 'edit', label })}
              >
                <Pencil size={15} strokeWidth={1.85} />
              </RowAction>
              <RowAction
                label={t('common.archive')}
                testId={`archive-${label.id}`}
                onClick={() => void handleArchive(label.id)}
              >
                <Archive size={15} strokeWidth={1.85} />
              </RowAction>
            </div>
          ))}
        </div>
      )}
    </div>
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
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised"
    >
      {children}
    </button>
  );
}
