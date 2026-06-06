import type { LabelNodeResponse } from '@cerebro/shared';
import { BottomSheet, Button } from '@cerebro/ui';
import { Archive, Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type LabelBody,
  archiveLabel,
  createLabel,
  editLabel,
  listLabels,
} from '../lib/api/endpoints.js';
import { type ParentOption } from '../components/LabelForm.js';
import { LabelForm } from '../components/LabelForm.js';

function flatten(nodes: LabelNodeResponse[], depth = 0): ParentOption[] {
  const out: ParentOption[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, name: n.name, depth });
    if (n.children.length) out.push(...flatten(n.children, depth + 1));
  }
  return out;
}

function selfAndDescendantIds(node: LabelNodeResponse): Set<string> {
  const ids = new Set<string>([node.id]);
  const walk = (n: LabelNodeResponse) => {
    for (const c of n.children) {
      ids.add(c.id);
      walk(c);
    }
  };
  walk(node);
  return ids;
}

type Sheet =
  | { mode: 'create'; parentId: string | null }
  | { mode: 'edit'; node: LabelNodeResponse };

export function LabelsPage() {
  const { t } = useTranslation();
  const [tree, setTree] = useState<LabelNodeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiveError, setArchiveError] = useState(false);

  async function load() {
    setError(false);
    setTree(await listLabels());
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
        await createLabel({ ...body, parentId: body.parentId ?? sheet.parentId });
      } else {
        await editLabel(sheet.node.id, body);
      }
      setSheet(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(node: LabelNodeResponse) {
    setArchiveError(false);
    try {
      await archiveLabel(node.id);
      await load();
    } catch {
      setArchiveError(true);
    }
  }

  const parentOptions =
    sheet?.mode === 'edit'
      ? flatten(tree).filter(
          (o) => !selfAndDescendantIds(sheet.node).has(o.id),
        )
      : flatten(tree);

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
          onClick={() => setSheet({ mode: 'create', parentId: null })}
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

      {!loading && !error && tree.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('labels.empty')}
        </p>
      )}

      {!loading && !error && tree.length > 0 && (
        <div data-testid="labels-tree" className="flex flex-col gap-1">
          {tree.map((node) => (
            <LabelRow
              key={node.id}
              node={node}
              depth={0}
              onAddChild={(id) => setSheet({ mode: 'create', parentId: id })}
              onEdit={(n) => setSheet({ mode: 'edit', node: n })}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      <BottomSheet open={sheet !== null} onClose={() => setSheet(null)}>
        {sheet && (
          <LabelForm
            parentOptions={parentOptions}
            submitting={saving}
            onSubmit={handleSubmit}
            initial={
              sheet.mode === 'edit'
                ? {
                    name: sheet.node.name,
                    color: sheet.node.color,
                    parentId: sheet.node.parentId,
                  }
                : undefined
            }
          />
        )}
      </BottomSheet>
    </main>
  );
}

function LabelRow({
  node,
  depth,
  onAddChild,
  onEdit,
  onArchive,
}: {
  node: LabelNodeResponse;
  depth: number;
  onAddChild: (id: string) => void;
  onEdit: (node: LabelNodeResponse) => void;
  onArchive: (node: LabelNodeResponse) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div
        className="flex items-center gap-2 rounded-[var(--radius-card)] py-2"
        style={{ paddingLeft: `${depth * 1.25}rem` }}
        data-testid={`label-row-${node.id}`}
      >
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{
            backgroundColor: node.color ?? 'transparent',
            border: node.color ? 'none' : '1px solid var(--cerebro-border)',
          }}
          aria-hidden
        />
        <span
          className="flex-1 truncate text-sm font-medium"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {node.name}
        </span>
        <RowAction
          label={t('labels.addChild')}
          testId={`add-child-${node.id}`}
          onClick={() => onAddChild(node.id)}
        >
          <Plus size={15} strokeWidth={2} />
        </RowAction>
        <RowAction
          label={t('labels.edit')}
          testId={`edit-${node.id}`}
          onClick={() => onEdit(node)}
        >
          <Pencil size={15} strokeWidth={1.85} />
        </RowAction>
        <RowAction
          label={t('common.archive')}
          testId={`archive-${node.id}`}
          onClick={() => onArchive(node)}
        >
          <Archive size={15} strokeWidth={1.85} />
        </RowAction>
      </div>
      {node.children.map((child) => (
        <LabelRow
          key={child.id}
          node={child}
          depth={depth + 1}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onArchive={onArchive}
        />
      ))}
    </>
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
