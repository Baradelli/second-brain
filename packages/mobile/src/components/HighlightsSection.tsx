import type { HighlightColorInput, HighlightResponse } from '@cerebro/shared';
import {
  archiveHighlight,
  createHighlight,
  createNote,
  editHighlight,
  listHighlightColors,
  listHighlights,
  textToDoc,
} from '@cerebro/shared/client';
import { BottomSheet, Button, Card, EmptyState } from '@cerebro/ui';
import { Archive, Pencil, Plus, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type PromptRequest, PromptSheet } from './PromptSheet.js';

type EditorState =
  | { mode: 'new' }
  | { mode: 'edit'; highlight: HighlightResponse }
  | null;

const FIELD_CLASS =
  'w-full rounded-[var(--radius-card)] border px-3 py-2 text-sm outline-none';
const FIELD_STYLE = {
  backgroundColor: 'var(--cerebro-raised)',
  color: 'var(--cerebro-fg)',
  borderColor: 'var(--cerebro-border)',
} as const;

/**
 * Seção "Grifos" do detalhe de um Recurso no mobile. Lista os marca-textos como
 * cards (cor + significado + trecho + comentário), filtra por cor e cria/edita
 * num BottomSheet. Arquivar remove da lista (mesmo padrão dos fichamentos aqui).
 */
export function HighlightsSection({ resourceId }: { resourceId: string }) {
  const navigate = useNavigate();
  // Explicar trecho (Tarefa 81): o grifo vira o excerpt da skill study.explain.
  const [promptReq, setPromptReq] = useState<PromptRequest | null>(null);

  function openExplainPrompt(quote: string, comment: string | null) {
    const excerpt = comment ? `${quote}

(nota do leitor: ${comment})` : quote;
    setPromptReq({
      skill: 'study.explain',
      context: { excerpt },
      apply: async (text) => {
        const note = await createNote({
          type: 'NOTE',
          doc: textToDoc(text),
          title: `${quote.slice(0, 60)} — explicado`,
        });
        navigate(`/editor/${note.id}`);
      },
    });
  }

  const { t } = useTranslation();
  const [palette, setPalette] = useState<HighlightColorInput[]>([]);
  const [highlights, setHighlights] = useState<HighlightResponse[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [editor, setEditor] = useState<EditorState>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listHighlightColors(), listHighlights({ resourceId })])
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
    <section className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <h2
          className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {t('resource.highlights.title')}
        </h2>
        <Button
          size="sm"
          onClick={() => setEditor({ mode: 'new' })}
          data-testid="new-highlight"
        >
          <Plus size={16} strokeWidth={2.25} />
          {t('resource.highlights.new')}
        </Button>
      </div>

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

      {highlights.length === 0 ? (
        <EmptyState title={t('resource.highlights.empty')} />
      ) : (
        <div className="space-y-2.5" data-testid="resource-highlights">
          {visible.map((h) => {
            const color = colorById.get(h.colorId);
            return (
              <Card key={h.id} padding="sm">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border"
                    style={{
                      backgroundColor: color?.color ?? 'transparent',
                      borderColor: 'var(--cerebro-border)',
                    }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    {(h.location || color) && (
                      <p
                        className="mb-0.5 text-[0.625rem] uppercase tracking-wide"
                        style={{ color: 'var(--cerebro-faint)' }}
                      >
                        {[color?.name, h.location]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    <p
                      className="text-sm leading-snug"
                      style={{ color: 'var(--cerebro-fg)' }}
                    >
                      {h.quote}
                    </p>
                    {h.comment && (
                      <p
                        className="mt-1 whitespace-pre-line text-xs leading-relaxed"
                        style={{ color: 'var(--cerebro-muted)' }}
                      >
                        {h.comment}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      aria-label={t('ai.skill.study.explain')}
                      data-testid={`explain-highlight-${h.id}`}
                      onClick={() => openExplainPrompt(h.quote, h.comment)}
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ color: 'var(--cerebro-muted)' }}
                    >
                      <Sparkles size={15} strokeWidth={1.85} />
                    </button>
                    <button
                      type="button"
                      aria-label={t('common.save')}
                      onClick={() => setEditor({ mode: 'edit', highlight: h })}
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ color: 'var(--cerebro-muted)' }}
                    >
                      <Pencil size={15} strokeWidth={1.85} />
                    </button>
                    <button
                      type="button"
                      aria-label={t('common.archive')}
                      onClick={async () => {
                        await archiveHighlight(h.id);
                        setHighlights((prev) =>
                          prev.filter((x) => x.id !== h.id),
                        );
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ color: 'var(--cerebro-muted)' }}
                    >
                      <Archive size={15} strokeWidth={1.85} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PromptSheet request={promptReq} onClose={() => setPromptReq(null)} />

      <BottomSheet open={editor !== null} onClose={() => setEditor(null)}>
        {editor && (
          <HighlightForm
            palette={palette}
            initial={editor.mode === 'edit' ? editor.highlight : undefined}
            onSubmit={async (data) => {
              if (editor.mode === 'edit') {
                upsertLocal(await editHighlight(editor.highlight.id, data));
              } else {
                upsertLocal(await createHighlight({ resourceId, ...data }));
              }
              setEditor(null);
            }}
          />
        )}
      </BottomSheet>
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
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-medium"
      style={
        active
          ? {
              backgroundColor: 'var(--cerebro-accent)',
              color: 'var(--cerebro-on-accent)',
            }
          : {
              border: '1px solid var(--cerebro-border)',
              color: 'var(--cerebro-muted)',
            }
      }
    >
      {color && (
        <span
          className="h-2.5 w-2.5 rounded-full border"
          style={{
            backgroundColor: color,
            borderColor: 'var(--cerebro-border)',
          }}
          aria-hidden
        />
      )}
      {label}
    </button>
  );
}

interface FormData {
  colorId: string;
  quote: string;
  location: string | null;
  comment: string | null;
}

function HighlightForm({
  palette,
  initial,
  onSubmit,
}: {
  palette: HighlightColorInput[];
  initial?: HighlightResponse;
  onSubmit: (data: FormData) => Promise<void>;
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

  return (
    <div className="flex flex-col gap-3">
      <h2
        className="font-display text-lg font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('resource.highlights.new')}
      </h2>

      <div className="flex flex-col gap-1">
        <span
          className="text-[0.6875rem] font-medium"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {t('highlight.field.color')}
        </span>
        <div className="flex flex-wrap gap-2">
          {palette.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.name}
              aria-pressed={colorId === c.id}
              onClick={() => setColorId(c.id)}
              className="h-8 w-8 rounded-full transition-transform"
              style={{
                backgroundColor: c.color,
                border:
                  colorId === c.id
                    ? '2px solid var(--cerebro-fg)'
                    : '2px solid transparent',
                transform: colorId === c.id ? 'scale(1.1)' : undefined,
              }}
            />
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span
          className="text-[0.6875rem] font-medium"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {t('highlight.field.location')}
        </span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t('highlight.field.locationPlaceholder')}
          className={FIELD_CLASS}
          style={FIELD_STYLE}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span
          className="text-[0.6875rem] font-medium"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {t('highlight.field.quote')}
        </span>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder={t('highlight.field.quotePlaceholder')}
          rows={2}
          className={`${FIELD_CLASS} resize-y`}
          style={FIELD_STYLE}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span
          className="text-[0.6875rem] font-medium"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {t('highlight.field.comment')}
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('highlight.field.commentPlaceholder')}
          rows={2}
          className={`${FIELD_CLASS} resize-y`}
          style={FIELD_STYLE}
        />
      </label>

      <Button
        onClick={async () => {
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
            setSaving(false);
          }
        }}
        disabled={!canSave}
        data-testid="save-highlight"
      >
        {t('common.save')}
      </Button>
    </div>
  );
}
