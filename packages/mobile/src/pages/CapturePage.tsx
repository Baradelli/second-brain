import { type CaptureResponse, type NoteType } from '@cerebro/shared';
import {
  archiveCapture,
  type CreateGoalBody,
  type CreateResourceBody,
  editCapture,
  listCaptures,
  promoteCapture,
  type PromoteCaptureBody,
  unarchiveCapture,
} from '@cerebro/shared/client';
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  GoalForm,
  ResourceForm,
  SectionHeader,
  Textarea,
} from '@cerebro/ui';
import { Archive, ChevronDown, Inbox, Pencil, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { LabelPicker } from '../components/LabelPicker.js';
import { QuickCaptureForm } from '../components/QuickCaptureForm.js';

const PROMOTE_TYPES: Array<{
  type: NoteType;
  labelKey: string;
  color: string;
}> = [
  {
    type: 'DEVOTIONAL',
    labelKey: 'editor.type.devotional',
    color: 'var(--cerebro-devotional)',
  },
  {
    type: 'REFLECTION',
    labelKey: 'editor.type.reflection',
    color: 'var(--cerebro-reflection)',
  },
  {
    type: 'STUDY_NOTE',
    labelKey: 'editor.type.study',
    color: 'var(--cerebro-study)',
  },
  { type: 'NOTE', labelKey: 'editor.type.note', color: 'var(--cerebro-note)' },
];

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (hours < 1) return 'agora há pouco';
  if (hours < 24) return `há ${hours}h`;
  if (days === 1) return 'ontem';
  return `há ${days} dias`;
}

export function CapturePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [pending, setPending] = useState<CaptureResponse[]>([]);
  const [archived, setArchived] = useState<CaptureResponse[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [loadingArchived, setLoadingArchived] = useState(false);

  const [promoteTarget, setPromoteTarget] = useState<CaptureResponse | null>(
    null,
  );
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState(false);

  // Edição de captura pendente (Tarefa 78): corrigir o texto antes de triar.
  const [editTarget, setEditTarget] = useState<CaptureResponse | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const list = await listCaptures('PENDING');
      setPending(list);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  async function handleArchive(id: string) {
    await archiveCapture(id);
    setPending((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleRestore(id: string) {
    await unarchiveCapture(id);
    setArchived((prev) => prev.filter((c) => c.id !== id));
    await loadPending();
  }

  function openEdit(capture: CaptureResponse) {
    setEditTarget(capture);
    setEditText(capture.text);
  }

  async function handleEditSave() {
    if (!editTarget || editText.trim().length === 0) return;
    setSavingEdit(true);
    try {
      const updated = await editCapture(editTarget.id, {
        text: editText.trim(),
      });
      setPending((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      );
      setEditTarget(null);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handlePromote(body: PromoteCaptureBody) {
    if (!promoteTarget) return;
    setPromoting(true);
    setPromoteError(false);
    try {
      const result = await promoteCapture(promoteTarget.id, body);
      setPending((prev) => prev.filter((c) => c.id !== promoteTarget.id));
      setPromoteTarget(null);
      if ('note' in result) navigate(`/editor/${result.note.id}`);
      else if ('resource' in result) navigate('/library');
      else navigate('/goals');
    } catch {
      setPromoteError(true);
    } finally {
      setPromoting(false);
    }
  }

  async function handleShowArchived() {
    if (showArchived) {
      setShowArchived(false);
      return;
    }
    setShowArchived(true);
    setLoadingArchived(true);
    try {
      const list = await listCaptures('ARCHIVED');
      setArchived(list);
    } finally {
      setLoadingArchived(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg pb-24">
      {/* ── Capture input ──────────────────────────────────────────────── */}
      <section className="px-5 pt-7 pb-6">
        <h1
          className="mb-4 font-display text-[1.75rem] font-semibold leading-tight"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('capture.section.input')}
        </h1>
        <QuickCaptureForm onCaptured={() => void loadPending()} rows={4} />
      </section>

      {/* ── Pending queue ──────────────────────────────────────────────── */}
      <section className="px-5 pt-1">
        <div className="mb-3 flex items-center gap-2">
          <SectionHeader label={t('capture.section.review')} />
          {pending.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[0.625rem] font-bold"
              style={{
                backgroundColor: 'var(--cerebro-accent-soft)',
                color: 'var(--cerebro-accent)',
              }}
            >
              {pending.length}
            </span>
          )}
        </div>

        {loadingPending ? (
          <LoadingDots />
        ) : pending.length === 0 ? (
          <EmptyState
            icon={<Inbox size={20} strokeWidth={1.75} />}
            title={t('capture.queue.empty')}
          />
        ) : (
          <div className="space-y-3">
            {pending.map((capture) => (
              <CaptureCard
                key={capture.id}
                capture={capture}
                onArchive={() => handleArchive(capture.id)}
                onPromote={() => setPromoteTarget(capture)}
                onEdit={() => openEdit(capture)}
              />
            ))}
          </div>
        )}

        {/* ── Archived toggle ──────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => void handleShowArchived()}
          className="mt-6 mb-2 inline-flex items-center gap-1 text-xs font-medium transition-opacity duration-150 hover:opacity-60"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {showArchived
            ? t('capture.archived.hide')
            : t('capture.archived.show')}
          <ChevronDown
            size={14}
            strokeWidth={2}
            className="transition-transform duration-200"
            style={{ transform: showArchived ? 'rotate(180deg)' : 'none' }}
          />
        </button>

        {showArchived && (
          <div className="mt-2 space-y-3">
            <SectionHeader
              label={t('capture.section.archived')}
              className="mb-2"
            />
            {loadingArchived ? (
              <LoadingDots />
            ) : archived.length === 0 ? (
              <EmptyState title={t('capture.archived.empty')} />
            ) : (
              archived.map((capture) => (
                <CaptureCard
                  key={capture.id}
                  capture={capture}
                  archived
                  onRestore={() => void handleRestore(capture.id)}
                />
              ))
            )}
          </div>
        )}
      </section>

      {/* ── Edit bottom sheet (Tarefa 78) ─────────────────────────────── */}
      <BottomSheet open={editTarget !== null} onClose={() => setEditTarget(null)}>
        <div className="flex flex-col gap-3">
          <h2
            className="font-display text-lg font-semibold"
            style={{ color: 'var(--cerebro-fg)' }}
          >
            {t('capture.edit')}
          </h2>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            aria-label={t('capture.edit')}
            data-testid="edit-capture-text"
          />
          <Button
            onClick={() => void handleEditSave()}
            disabled={savingEdit || editText.trim().length === 0}
            data-testid="edit-capture-save"
          >
            {t('common.save')}
          </Button>
        </div>
      </BottomSheet>

      {/* ── Promote bottom sheet ───────────────────────────────────────── */}
      <BottomSheet
        open={promoteTarget !== null}
        onClose={() => setPromoteTarget(null)}
      >
        <PromoteSheetContent
          captureText={promoteTarget?.text ?? ''}
          onPromote={(body) => void handlePromote(body)}
          promoting={promoting}
          error={promoteError}
        />
      </BottomSheet>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CaptureCard({
  capture,
  onArchive,
  onPromote,
  onEdit,
  onRestore,
  archived = false,
}: {
  capture: CaptureResponse;
  onArchive?: () => Promise<void>;
  onPromote?: () => void;
  onEdit?: () => void;
  onRestore?: () => void;
  archived?: boolean;
}) {
  const { t } = useTranslation();
  const [archiving, setArchiving] = useState(false);

  async function handleArchive() {
    if (!onArchive) return;
    setArchiving(true);
    try {
      await onArchive();
    } finally {
      setArchiving(false);
    }
  }

  return (
    <Card>
      <p
        className="text-[0.95rem] leading-relaxed"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {capture.text}
      </p>
      <p
        className="mt-2 text-[0.6875rem] font-medium uppercase tracking-wide"
        style={{ color: 'var(--cerebro-faint)' }}
      >
        {relativeTime(capture.createdAt)}
      </p>

      {!archived && (
        <div className="mt-3.5 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label={t('capture.edit')}
            data-testid={`edit-capture-${capture.id}`}
          >
            <Pencil size={14} strokeWidth={2} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleArchive()}
            disabled={archiving}
          >
            <Archive size={14} strokeWidth={2} />
            {t('common.archive')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onPromote}
            className="flex-1"
          >
            {t('capture.promote')}
          </Button>
        </div>
      )}

      {archived && capture.archiveReason && (
        <p
          className="mt-2 text-[0.6875rem] italic"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {capture.archiveReason}
        </p>
      )}

      {archived && onRestore && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestore}
            data-testid={`restore-capture-${capture.id}`}
          >
            <RotateCcw size={14} strokeWidth={2} />
            {t('common.restore')}
          </Button>
        </div>
      )}
    </Card>
  );
}

type PromoteDestination = 'note' | 'resource' | 'goal';

function PromoteSheetContent({
  captureText,
  onPromote,
  promoting,
  error,
}: {
  captureText: string;
  onPromote: (body: PromoteCaptureBody) => void;
  promoting: boolean;
  error: boolean;
}) {
  const { t } = useTranslation();
  const [destination, setDestination] = useState<PromoteDestination>('note');

  const destinations: { key: PromoteDestination; labelKey: string }[] = [
    { key: 'note', labelKey: 'promote.destination.note' },
    { key: 'resource', labelKey: 'promote.destination.resource' },
    { key: 'goal', labelKey: 'promote.destination.goal' },
  ];

  return (
    <div>
      <p
        className="mb-3 font-display text-lg font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('capture.promote.chooseType')}
      </p>

      {/* Seletor de destino */}
      <div className="mb-4 flex gap-2" data-testid="promote-destinations">
        {destinations.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDestination(key)}
            data-testid={`destination-${key}`}
            className="flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              backgroundColor:
                destination === key
                  ? 'var(--cerebro-accent-soft)'
                  : 'transparent',
              color:
                destination === key
                  ? 'var(--cerebro-accent)'
                  : 'var(--cerebro-muted)',
              border: '1px solid var(--cerebro-border)',
            }}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 text-xs" style={{ color: 'var(--cerebro-error)' }}>
          {t('promote.error')}
        </p>
      )}

      {destination === 'note' && (
        <div className="flex flex-col gap-2">
          {PROMOTE_TYPES.map(({ type, labelKey, color }) => (
            <button
              key={type}
              type="button"
              disabled={promoting}
              onClick={() => onPromote({ destination: 'note', type })}
              data-testid={`note-type-${type}`}
              className="flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3.5 transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor: 'var(--cerebro-raised)',
                border: '1px solid var(--cerebro-border)',
              }}
            >
              <span
                className="h-7 w-1 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--cerebro-fg)' }}
              >
                {t(labelKey)}
              </span>
            </button>
          ))}
        </div>
      )}

      {destination === 'resource' && (
        <ResourceForm
          defaultTitle={captureText}
          submitting={promoting}
          onSubmit={(body: CreateResourceBody) =>
            onPromote({ destination: 'resource', ...body })
          }
          renderLabelPicker={(p) => <LabelPicker {...p} />}
        />
      )}

      {destination === 'goal' && (
        <GoalForm
          defaultTitle={captureText}
          submitting={promoting}
          onSubmit={(body: CreateGoalBody) =>
            onPromote({ destination: 'goal', ...body })
          }
          renderLabelPicker={(p) => <LabelPicker {...p} />}
        />
      )}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1.5 py-4" aria-label="Carregando">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full"
          style={{
            backgroundColor: 'var(--cerebro-muted)',
            opacity: 0.4,
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  );
}
