import type { HighlightColorInput, HighlightResponse } from '@cerebro/shared';
import {
  archiveHighlight,
  createHighlight,
  deleteHighlight,
  editHighlight,
  listHighlightColors,
  listHighlights,
  unarchiveHighlight,
} from '@cerebro/shared/client';
import { Button } from '@cerebro/ui';
import { Archive, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '../shared/ConfirmDialog.js';

type Palette = HighlightColorInput[];

const INPUT_CLASS =
  'w-full rounded-[var(--radius-card)] border border-subtle bg-raised px-3 py-2 text-sm text-fg outline-none transition-all duration-150 placeholder:text-faint focus:ring-2 focus:ring-[var(--cerebro-accent-soft)]';

/**
 * Seção "Grifos" do detalhe de um Recurso (desktop). Tabela de marca-textos:
 * cada linha tem cor (com significado da paleta global), trecho grifado, local e
 * comentário. Filtra por cor no cliente, edita inline e arquiva/restaura/exclui.
 * A paleta vem do endpoint dedicado (`listHighlightColors`), não do Settings form.
 */
export function HighlightsSection({ resourceId }: { resourceId: string }) {
  const { t } = useTranslation();
  const [palette, setPalette] = useState<Palette>([]);
  const [highlights, setHighlights] = useState<HighlightResponse[]>([]);
  const [archived, setArchived] = useState<HighlightResponse[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listHighlightColors(),
      listHighlights({ resourceId }),
    ])
      .then(([colors, hs]) => {
        if (cancelled) return;
        setPalette(colors);
        setHighlights(hs);
      })
      .catch(() => {
        if (!cancelled) setPalette([]);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId]);

  const colorById = useMemo(() => {
    const map = new Map<string, HighlightColorInput>();
    for (const c of palette) map.set(c.id, c);
    return map;
  }, [palette]);

  const visible =
    filter === 'all'
      ? highlights
      : highlights.filter((h) => h.colorId === filter);

  async function loadArchived() {
    const next = !showArchived;
    setShowArchived(next);
    if (next && archived.length === 0) {
      try {
        setArchived(await listHighlights({ resourceId, status: 'ARCHIVED' }));
      } catch {
        setArchived([]);
      }
    }
  }

  function upsertLocal(h: HighlightResponse) {
    setHighlights((prev) => {
      const i = prev.findIndex((x) => x.id === h.id);
      if (i === -1) return [...prev, h];
      const copy = [...prev];
      copy[i] = h;
      return copy;
    });
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {t('resource.highlights.title')}
        </h2>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--cerebro-on-accent)] transition-opacity hover:opacity-90"
          >
            <Plus size={13} strokeWidth={2.5} aria-hidden />
            {t('resource.highlights.new')}
          </button>
        )}
      </div>

      {/* Filtro por cor — swatch + nome, nunca cor sozinha */}
      {palette.length > 0 && highlights.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <FilterChip
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label={t('resource.highlights.filterAll')}
          />
          {palette.map((c) => (
            <FilterChip
              key={c.id}
              active={filter === c.id}
              onClick={() => setFilter(c.id)}
              label={c.name}
              color={c.color}
            />
          ))}
        </div>
      )}

      {adding && (
        <HighlightEditor
          palette={palette}
          onCancel={() => setAdding(false)}
          onSubmit={async (data) => {
            const created = await createHighlight({ resourceId, ...data });
            upsertLocal(created);
            setAdding(false);
          }}
        />
      )}

      {highlights.length === 0 && !adding ? (
        <p className="text-xs text-muted">{t('resource.highlights.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {visible.map((h) =>
            editingId === h.id ? (
              <li key={h.id}>
                <HighlightEditor
                  palette={palette}
                  initial={h}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (data) => {
                    const updated = await editHighlight(h.id, data);
                    upsertLocal(updated);
                    setEditingId(null);
                  }}
                />
              </li>
            ) : (
              <li key={h.id}>
                <HighlightRow
                  highlight={h}
                  color={colorById.get(h.colorId)}
                  onEdit={() => {
                    setEditingId(h.id);
                    setAdding(false);
                  }}
                  onArchive={async () => {
                    await archiveHighlight(h.id);
                    setHighlights((prev) =>
                      prev.filter((x) => x.id !== h.id),
                    );
                    setArchived([]); // invalida cache de arquivados
                  }}
                />
              </li>
            ),
          )}
        </ul>
      )}

      {/* Arquivados */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => void loadArchived()}
          className="text-[0.6875rem] font-medium text-faint transition-colors hover:text-muted"
        >
          {showArchived
            ? t('common.archivedHide')
            : t('common.archivedShow')}
        </button>
        {showArchived && (
          <ul className="mt-2 flex flex-col gap-0.5">
            {archived.length === 0 ? (
              <li className="px-2 text-xs text-faint">
                {t('common.archivedEmpty')}
              </li>
            ) : (
              archived.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 opacity-70"
                >
                  <ColorSwatch color={colorById.get(h.colorId)?.color} />
                  <span className="min-w-0 flex-1 truncate text-sm text-muted line-through">
                    {h.quote}
                  </span>
                  <RowAction
                    label={t('common.restore')}
                    onClick={async () => {
                      await unarchiveHighlight(h.id);
                      setArchived((prev) => prev.filter((x) => x.id !== h.id));
                      upsertLocal({ ...h, status: 'ACTIVE' });
                    }}
                  >
                    <RotateCcw size={14} strokeWidth={1.75} aria-hidden />
                  </RowAction>
                  <RowAction
                    label={t('common.deletePermanently')}
                    danger
                    onClick={() => setConfirmDelete(h.id)}
                  >
                    <Trash2 size={14} strokeWidth={1.75} aria-hidden />
                  </RowAction>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        tone="danger"
        title={t('common.deletePermanently')}
        body={t('highlight.delete.confirm')}
        confirmLabel={t('common.deletePermanently')}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (confirmDelete) {
            await deleteHighlight(confirmDelete);
            setArchived((prev) => prev.filter((x) => x.id !== confirmDelete));
          }
          setConfirmDelete(null);
        }}
      />
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium transition-colors ${
        active
          ? 'bg-accent text-[var(--cerebro-on-accent)]'
          : 'border border-subtle text-muted hover:bg-card'
      }`}
    >
      {color && <ColorSwatch color={color} small />}
      {label}
    </button>
  );
}

function ColorSwatch({ color, small }: { color?: string; small?: boolean }) {
  const size = small ? 'h-2.5 w-2.5' : 'h-3 w-3';
  return (
    <span
      className={`${size} shrink-0 rounded-full border border-[var(--cerebro-border)]`}
      style={{ backgroundColor: color ?? 'transparent' }}
      aria-hidden
    />
  );
}

function HighlightRow({
  highlight,
  color,
  onEdit,
  onArchive,
}: {
  highlight: HighlightResponse;
  color?: HighlightColorInput;
  onEdit: () => void;
  onArchive: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <div className="group flex items-start gap-2.5 rounded px-2 py-2 transition-colors hover:bg-card">
      <span className="mt-0.5 flex items-center" title={color?.name}>
        <ColorSwatch color={color?.color} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {highlight.location && (
            <span className="shrink-0 text-[0.6875rem] font-medium text-faint">
              {highlight.location}
            </span>
          )}
          <p className="min-w-0 text-sm leading-snug text-fg">
            {highlight.quote}
          </p>
        </div>
        {highlight.comment && (
          <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-muted">
            {highlight.comment}
          </p>
        )}
        {color && (
          <span className="mt-1 inline-block text-[0.625rem] uppercase tracking-wide text-faint">
            {color.name}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <RowAction label={t('common.save')} onClick={onEdit}>
          <Pencil size={14} strokeWidth={1.75} aria-hidden />
        </RowAction>
        <RowAction label={t('common.archive')} onClick={() => void onArchive()}>
          <Archive size={14} strokeWidth={1.75} aria-hidden />
        </RowAction>
      </div>
    </div>
  );
}

function RowAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded p-1.5 transition-colors hover:bg-raised ${
        danger ? 'text-[var(--cerebro-error)]' : 'text-faint hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}

interface EditorData {
  colorId: string;
  quote: string;
  location: string | null;
  comment: string | null;
}

function HighlightEditor({
  palette,
  initial,
  onCancel,
  onSubmit,
}: {
  palette: Palette;
  initial?: HighlightResponse;
  onCancel: () => void;
  onSubmit: (data: EditorData) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [colorId, setColorId] = useState(
    initial?.colorId ?? palette[0]?.id ?? '',
  );
  const [quote, setQuote] = useState(initial?.quote ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [saving, setSaving] = useState(false);

  const canSave = quote.trim().length > 0 && colorId && !saving;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit({
        colorId,
        quote: quote.trim(),
        location: location.trim() || null,
        comment: comment.trim() || null,
      });
    } catch {
      setSaving(false); // mantém o form aberto para nova tentativa
    }
  }

  return (
    <div className="my-1 flex flex-col gap-2 rounded-[var(--radius-card)] border border-subtle bg-card/40 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[0.6875rem] font-medium text-muted">
            {t('highlight.field.color')}
          </span>
          <div className="flex flex-wrap gap-1">
            {palette.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColorId(c.id)}
                aria-pressed={colorId === c.id}
                aria-label={c.name}
                title={c.name}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${
                  colorId === c.id
                    ? 'scale-110 border-fg'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c.color }}
              />
            ))}
          </div>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[0.6875rem] font-medium text-muted">
            {t('highlight.field.location')}
          </span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('highlight.field.locationPlaceholder')}
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[0.6875rem] font-medium text-muted">
          {t('highlight.field.quote')}
        </span>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder={t('highlight.field.quotePlaceholder')}
          rows={2}
          autoFocus
          className={`${INPUT_CLASS} resize-y`}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[0.6875rem] font-medium text-muted">
          {t('highlight.field.comment')}
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('highlight.field.commentPlaceholder')}
          rows={2}
          className={`${INPUT_CLASS} resize-y`}
        />
      </label>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={!canSave}
          className="h-9 px-3 text-xs"
        >
          {t('common.save')}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 rounded px-2 py-1.5 text-xs text-muted transition-colors hover:text-fg"
        >
          <X size={14} strokeWidth={1.75} aria-hidden />
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
