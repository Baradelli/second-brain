import { type CaptureResponse, type NoteType } from '@cerebro/shared';
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  SectionHeader,
} from '@cerebro/ui';
import { Archive, ChevronDown, Inbox } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  archiveCapture,
  listCaptures,
  promoteCaptureToNote,
} from '../lib/api/endpoints.js';
import { QuickCaptureForm } from '../components/QuickCaptureForm.js';

const PROMOTE_TYPES: Array<{ type: NoteType; labelKey: string; color: string }> = [
  { type: 'DEVOTIONAL', labelKey: 'editor.type.devotional', color: 'var(--cerebro-devotional)' },
  { type: 'REFLECTION', labelKey: 'editor.type.reflection', color: 'var(--cerebro-reflection)' },
  { type: 'STUDY_NOTE', labelKey: 'editor.type.study', color: 'var(--cerebro-study)' },
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

  const [promoteTarget, setPromoteTarget] = useState<CaptureResponse | null>(null);
  const [promoting, setPromoting] = useState(false);

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

  async function handlePromote(type: NoteType) {
    if (!promoteTarget) return;
    setPromoting(true);
    try {
      const { note } = await promoteCaptureToNote(promoteTarget.id, type);
      setPending((prev) => prev.filter((c) => c.id !== promoteTarget.id));
      setPromoteTarget(null);
      navigate(`/editor/${note.id}`);
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
          {showArchived ? t('capture.archived.hide') : t('capture.archived.show')}
          <ChevronDown
            size={14}
            strokeWidth={2}
            className="transition-transform duration-200"
            style={{ transform: showArchived ? 'rotate(180deg)' : 'none' }}
          />
        </button>

        {showArchived && (
          <div className="mt-2 space-y-3">
            <SectionHeader label={t('capture.section.archived')} className="mb-2" />
            {loadingArchived ? (
              <LoadingDots />
            ) : archived.length === 0 ? (
              <EmptyState title={t('capture.archived.empty')} />
            ) : (
              archived.map((capture) => (
                <CaptureCard key={capture.id} capture={capture} archived />
              ))
            )}
          </div>
        )}
      </section>

      {/* ── Promote bottom sheet ───────────────────────────────────────── */}
      <BottomSheet
        open={promoteTarget !== null}
        onClose={() => setPromoteTarget(null)}
      >
        <PromoteSheetContent onSelect={(t) => void handlePromote(t)} promoting={promoting} />
      </BottomSheet>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CaptureCard({
  capture,
  onArchive,
  onPromote,
  archived = false,
}: {
  capture: CaptureResponse;
  onArchive?: () => Promise<void>;
  onPromote?: () => void;
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
      <p className="mt-2 text-[0.6875rem] font-medium uppercase tracking-wide" style={{ color: 'var(--cerebro-faint)' }}>
        {relativeTime(capture.createdAt)}
      </p>

      {!archived && (
        <div className="mt-3.5 flex items-center gap-2">
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
    </Card>
  );
}

function PromoteSheetContent({
  onSelect,
  promoting,
}: {
  onSelect: (type: NoteType) => void;
  promoting: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <p
        className="mb-4 font-display text-lg font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('capture.promote.chooseType')}
      </p>
      <div className="flex flex-col gap-2">
        {PROMOTE_TYPES.map(({ type, labelKey, color }) => (
          <button
            key={type}
            type="button"
            disabled={promoting}
            onClick={() => onSelect(type)}
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
