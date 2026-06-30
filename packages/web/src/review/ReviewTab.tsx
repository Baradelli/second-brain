import {
  type CaptureResponse,
  type GoalTypeInput,
  type NoteType,
  type ResourceTypeInput,
} from '@cerebro/shared';
import {
  archiveCapture,
  deleteCapture,
  listCaptures,
  promoteCapture,
  type PromoteCaptureBody,
  unarchiveCapture,
} from '@cerebro/shared/client';
import { Button, Card, EmptyState, Input, SectionHeader } from '@cerebro/ui';
import { Archive, Inbox, RotateCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '../shared/ConfirmDialog.js';
import { useTabs } from '../tabs/tabs-context.js';
import { tabForPromoteResult } from './promote-target.js';

const NOTE_TYPES: { type: NoteType; labelKey: string }[] = [
  { type: 'DEVOTIONAL', labelKey: 'editor.type.devotional' },
  { type: 'REFLECTION', labelKey: 'editor.type.reflection' },
  { type: 'STUDY_NOTE', labelKey: 'editor.type.study' },
  { type: 'NOTE', labelKey: 'editor.type.note' },
];

const RESOURCE_TYPES: ResourceTypeInput[] = [
  'book',
  'course',
  'video',
  'article',
  'podcast',
  'other',
];

const GOAL_TYPES: GoalTypeInput[] = ['HABIT', 'TARGET', 'PROJECT', 'UMBRELLA'];

type Destination = 'note' | 'resource' | 'goal';

/**
 * Aba de Revisão (triagem) do desktop — a "caixa de entrada" das capturas
 * pendentes. Espelha o `CapturePage`/`ReviewPage` do mobile e reusa os mesmos
 * endpoints (`listCaptures`/`archiveCapture`/`promoteCapture`) com o mesmo payload
 * discriminado de promoção. Promover para nota abre a aba da nota; depois de
 * qualquer ação a lista se atualiza. Inbox zero aqui é uma vitória, não um susto.
 */
export function ReviewTab() {
  const { t } = useTranslation();
  const { openTab } = useTabs();

  const [pending, setPending] = useState<CaptureResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [promoteId, setPromoteId] = useState<string | null>(null);

  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<CaptureResponse[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      const list = await listCaptures('PENDING');
      setPending(list);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadArchived = useCallback(async () => {
    setArchived(await listCaptures('ARCHIVED'));
  }, []);

  async function toggleArchived() {
    const next = !showArchived;
    setShowArchived(next);
    if (next) {
      try {
        await loadArchived();
      } catch {
        setArchived([]);
      }
    }
  }

  async function handleArchive(id: string) {
    await archiveCapture(id);
    setPending((prev) => prev.filter((c) => c.id !== id));
    if (promoteId === id) setPromoteId(null);
    if (showArchived) await loadArchived();
  }

  async function handlePromote(
    capture: CaptureResponse,
    body: PromoteCaptureBody,
  ) {
    const result = await promoteCapture(capture.id, body);
    setPending((prev) => prev.filter((c) => c.id !== capture.id));
    setPromoteId(null);
    const tab = tabForPromoteResult(result, capture.text.trim());
    if (tab) openTab(tab);
  }

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
        <p className="text-sm text-muted">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="page-wide h-full overflow-auto px-6 pb-16 sm:px-8">
      <header className="pt-10 pb-6">
        <h1 className="font-display text-3xl font-semibold leading-tight text-fg">
          {t('review.title')}
        </h1>
      </header>

      {pending.length === 0 ? (
        <EmptyState
          icon={<Inbox size={22} strokeWidth={1.75} />}
          title={t('capture.queue.empty')}
          className="mt-10"
        />
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2">
            <SectionHeader label={t('capture.section.review')} />
            <span className="rounded-full bg-card px-2 py-0.5 text-[0.625rem] font-bold text-accent">
              {pending.length}
            </span>
          </div>
          {/* Grade de triagem: visão geral no desktop, expande por card */}
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pending.map((capture) => (
              <CaptureCard
                key={capture.id}
                capture={capture}
                expanded={promoteId === capture.id}
                onArchive={() => handleArchive(capture.id)}
                onTogglePromote={() =>
                  setPromoteId((cur) =>
                    cur === capture.id ? null : capture.id,
                  )
                }
                onPromote={(body) => handlePromote(capture, body)}
              />
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => void toggleArchived()}
        className="mt-6 px-1 py-1.5 text-left text-xs font-medium text-accent transition-colors hover:underline"
      >
        {showArchived ? t('capture.archived.hide') : t('capture.archived.show')}
      </button>

      {showArchived && (
        <div className="mt-1 flex flex-col gap-1.5">
          {archived.length === 0 ? (
            <p className="px-1 py-2 text-xs text-muted">
              {t('capture.archived.empty')}
            </p>
          ) : (
            archived.map((capture) => (
              <div
                key={capture.id}
                className="flex items-start gap-3 rounded-[var(--radius-card)] border border-subtle px-3 py-2.5"
              >
                <p className="min-w-0 flex-1 truncate text-sm text-muted">
                  {capture.text}
                </p>
                <button
                  type="button"
                  aria-label={t('capture.restore')}
                  onClick={() =>
                    void unarchiveCapture(capture.id)
                      .then(() => Promise.all([load(), loadArchived()]))
                      .catch(() => {})
                  }
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised"
                >
                  <RotateCcw size={15} strokeWidth={1.85} />
                </button>
                <button
                  type="button"
                  aria-label={t('common.deletePermanently')}
                  onClick={() => setDeleteId(capture.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised"
                  style={{ color: 'var(--cerebro-error)' }}
                >
                  <Trash2 size={15} strokeWidth={1.85} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        tone="danger"
        title={t('capture.deleteConfirm.title')}
        body={t('capture.deleteConfirm.body')}
        confirmLabel={t('capture.deleteConfirm.confirm')}
        blockedMessage={t('capture.deleteBlocked')}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          await deleteCapture(deleteId);
          setDeleteId(null);
          await loadArchived();
        }}
      />
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function CaptureCard({
  capture,
  expanded,
  onArchive,
  onTogglePromote,
  onPromote,
}: {
  capture: CaptureResponse;
  expanded: boolean;
  onArchive: () => Promise<void>;
  onTogglePromote: () => void;
  onPromote: (body: PromoteCaptureBody) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function handleArchive() {
    setBusy(true);
    try {
      await onArchive();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-fg">
        {capture.text}
      </p>
      <div className="mt-3.5 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void handleArchive()}
          disabled={busy}
        >
          <Archive size={14} strokeWidth={2} />
          {t('common.archive')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onTogglePromote}
          className="flex-1"
        >
          {t('capture.promote.chooseType')}
        </Button>
      </div>

      {expanded && (
        <PromoteForm defaultTitle={capture.text.trim()} onPromote={onPromote} />
      )}
    </Card>
  );
}

function PromoteForm({
  defaultTitle,
  onPromote,
}: {
  defaultTitle: string;
  onPromote: (body: PromoteCaptureBody) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [destination, setDestination] = useState<Destination>('note');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const destinations: { key: Destination; labelKey: string }[] = [
    { key: 'note', labelKey: 'promote.destination.note' },
    { key: 'resource', labelKey: 'promote.destination.resource' },
    { key: 'goal', labelKey: 'promote.destination.goal' },
  ];

  async function submit(body: PromoteCaptureBody) {
    setSubmitting(true);
    setError(false);
    try {
      await onPromote(body);
    } catch {
      setError(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3.5 border-t border-subtle pt-3.5">
      <div className="mb-3 flex gap-2" data-testid="promote-destinations">
        {destinations.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDestination(key)}
            data-testid={`destination-${key}`}
            className={`flex-1 rounded-full border border-subtle px-3 py-1.5 text-xs font-semibold transition-colors ${
              destination === key
                ? 'bg-card text-accent'
                : 'bg-transparent text-muted hover:bg-card'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 text-xs text-error" role="alert">
          {t('promote.error')}
        </p>
      )}

      {destination === 'note' && (
        <div className="grid grid-cols-2 gap-2">
          {NOTE_TYPES.map(({ type, labelKey }) => (
            <button
              key={type}
              type="button"
              disabled={submitting}
              onClick={() => void submit({ destination: 'note', type })}
              data-testid={`note-type-${type}`}
              className="rounded-[var(--radius-card)] border border-subtle bg-raised px-4 py-3 text-left text-sm font-semibold text-fg transition-colors hover:bg-card disabled:opacity-50"
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}

      {destination === 'resource' && (
        <ResourceFields
          defaultTitle={defaultTitle}
          submitting={submitting}
          onSubmit={(body) => void submit(body)}
        />
      )}

      {destination === 'goal' && (
        <GoalFields
          defaultTitle={defaultTitle}
          submitting={submitting}
          onSubmit={(body) => void submit(body)}
        />
      )}
    </div>
  );
}

function ResourceFields({
  defaultTitle,
  submitting,
  onSubmit,
}: {
  defaultTitle: string;
  submitting: boolean;
  onSubmit: (body: PromoteCaptureBody) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(defaultTitle);
  const [type, setType] = useState<ResourceTypeInput>('book');
  const [author, setAuthor] = useState('');
  const [url, setUrl] = useState('');

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          destination: 'resource',
          type,
          title: title.trim(),
          author: author.trim() || null,
          url: url.trim() || null,
        });
      }}
    >
      <Input
        label={t('resource.field.title')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TypeSelect
        label={t('resource.field.type')}
        value={type}
        onChange={(v) => setType(v as ResourceTypeInput)}
        options={RESOURCE_TYPES.map((rt) => ({
          value: rt,
          label: t(`resource.type.${rt}`),
        }))}
      />
      <Input
        label={t('resource.field.author')}
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
      />
      <Input
        label={t('resource.field.url')}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button type="submit" disabled={submitting || !title.trim()}>
        {submitting ? t('capture.submitting') : t('common.save')}
      </Button>
    </form>
  );
}

function GoalFields({
  defaultTitle,
  submitting,
  onSubmit,
}: {
  defaultTitle: string;
  submitting: boolean;
  onSubmit: (body: PromoteCaptureBody) => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(defaultTitle);
  const [type, setType] = useState<GoalTypeInput>('HABIT');

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSubmit({ destination: 'goal', type, title: title.trim() });
      }}
    >
      <Input
        label={t('goal.field.title')}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TypeSelect
        label={t('goal.field.type')}
        value={type}
        onChange={(v) => setType(v as GoalTypeInput)}
        options={GOAL_TYPES.map((gt) => ({
          value: gt,
          label: t(`goal.type.${gt}`),
        }))}
      />
      <Button type="submit" disabled={submitting || !title.trim()}>
        {submitting ? t('capture.submitting') : t('common.save')}
      </Button>
    </form>
  );
}

function TypeSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg/80">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-[var(--radius-card)] border border-subtle bg-raised px-4 text-sm text-fg outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
