import type { StudyItemResponse } from '@cerebro/shared';
import { BottomSheet, Button, Card, EmptyState } from '@cerebro/ui';
import { Brain, FileText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { StudyItemForm } from '../components/StudyItemForm.js';
import {
  createStudyItem,
  type CreateStudyItemInput,
  listStudyItems,
  logRecall,
} from '../lib/api/endpoints.js';

function scheduleBadge(
  item: StudyItemResponse,
  t: (k: string, o?: Record<string, unknown>) => string,
  locale: string,
): { label: string; tone: 'due' | 'overdue' | 'muted' } {
  const s = item.schedule;
  if (s.consolidated)
    return { label: t('study.schedule.consolidated'), tone: 'muted' };
  if (s.dueToday) {
    return s.overdue
      ? { label: t('study.schedule.overdue'), tone: 'overdue' }
      : { label: t('study.schedule.dueToday'), tone: 'due' };
  }
  const date = s.nextRecallAt
    ? new Date(s.nextRecallAt).toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
      })
    : '—';
  return { label: t('study.schedule.next', { date }), tone: 'muted' };
}

export function StudyItemsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState<StudyItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(params.get('new') === '1');
  const [reviewing, setReviewing] = useState<StudyItemResponse | null>(null);

  const resourceId = params.get('resourceId') ?? undefined;
  const reviewId = params.get('review');

  function reload() {
    setLoading(true);
    setError(false);
    listStudyItems()
      .then((data) => setItems(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listStudyItems()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
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

  // Deep-link ?review=<id> (vindo da Agenda) abre o RecallSheet quando o item carrega.
  useEffect(() => {
    if (!reviewId) return;
    const found = items.find((i) => i.id === reviewId);
    if (found) setReviewing(found);
  }, [reviewId, items]);

  async function handleCreate(body: CreateStudyItemInput) {
    setCreating(true);
    try {
      await createStudyItem(body);
      setSheetOpen(false);
      // limpa os query params de criação
      params.delete('new');
      params.delete('resourceId');
      setParams(params, { replace: true });
      reload();
    } finally {
      setCreating(false);
    }
  }

  async function handleRecall(confidence: 'A' | 'B' | 'C') {
    if (!reviewing) return;
    await logRecall(reviewing.id, { confidence });
    setReviewing(null);
    if (reviewId) {
      params.delete('review');
      setParams(params, { replace: true });
    }
    reload();
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <div className="mb-5 flex items-center justify-between">
        <h1
          className="font-display text-[1.75rem] font-semibold leading-tight"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('study.title')}
        </h1>
        <Button
          size="sm"
          onClick={() => setSheetOpen(true)}
          data-testid="new-study-item"
        >
          <Plus size={16} strokeWidth={2.25} />
          {t('study.new')}
        </Button>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.loading')}
        </p>
      )}
      {error && !loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('study.error')}
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<Brain size={20} strokeWidth={1.75} />}
          title={t('study.empty')}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-2.5">
          {items.map((item) => {
            const badge = scheduleBadge(item, t, i18n.language);
            const tone =
              badge.tone === 'overdue'
                ? 'var(--cerebro-error, var(--cerebro-accent))'
                : badge.tone === 'due'
                  ? 'var(--cerebro-accent)'
                  : 'var(--cerebro-muted)';
            return (
              <Card key={item.id} padding="sm">
                <button
                  type="button"
                  onClick={() => setReviewing(item)}
                  data-testid={`study-item-${item.id}`}
                  className="flex w-full items-start gap-3 text-left transition-transform duration-150 active:scale-[0.99]"
                >
                  <span
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: 'var(--cerebro-accent-soft)',
                      color: 'var(--cerebro-accent)',
                    }}
                    aria-hidden
                  >
                    <Brain size={18} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: 'var(--cerebro-fg)' }}
                    >
                      {item.title}
                    </p>
                    <p
                      className="mt-0.5 text-[0.6875rem] font-semibold"
                      style={{ color: tone }}
                    >
                      {badge.label}
                      {item.reference ? ` · ${item.reference}` : ''}
                    </p>
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Criar item */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <StudyItemForm
          onSubmit={handleCreate}
          submitting={creating}
          resourceId={resourceId}
        />
      </BottomSheet>

      {/* Revisar (recall) */}
      <RecallSheet
        item={reviewing}
        onClose={() => setReviewing(null)}
        onRecall={handleRecall}
        onWriteFichamento={(item) =>
          navigate(
            item.resourceId
              ? `/editor?type=STUDY_NOTE&resourceId=${item.resourceId}`
              : `/editor?type=STUDY_NOTE`,
          )
        }
      />
    </main>
  );
}

// ── RecallSheet ───────────────────────────────────────────────────────────────

function RecallSheet({
  item,
  onClose,
  onRecall,
  onWriteFichamento,
}: {
  item: StudyItemResponse | null;
  onClose: () => void;
  onRecall: (confidence: 'A' | 'B' | 'C') => void;
  onWriteFichamento: (item: StudyItemResponse) => void;
}) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  async function mark(confidence: 'A' | 'B' | 'C') {
    setSaving(true);
    try {
      await onRecall(confidence);
    } finally {
      setSaving(false);
    }
  }

  const contextPrompts = [
    t('review.context.where'),
    t('review.context.against'),
    t('review.context.transition'),
  ];

  return (
    <BottomSheet open={item !== null} onClose={onClose}>
      {item && (
        <div className="flex flex-col gap-4">
          <div>
            <h2
              className="font-display text-lg font-semibold"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {item.title}
            </h2>
            <p
              className="mt-1 text-sm font-medium"
              style={{ color: 'var(--cerebro-accent)' }}
            >
              {t('review.tryRecall')}
            </p>
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: 'var(--cerebro-muted)' }}
            >
              {t('review.tryRecall.body')}
            </p>
          </div>

          {item.questions &&
            (item.questions.before.length > 0 ||
              item.questions.after.length > 0) && (
              <div>
                <h3
                  className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--cerebro-muted)' }}
                >
                  {t('review.questions')}
                </h3>
                <ul
                  className="mt-1.5 list-disc pl-5 text-sm"
                  style={{ color: 'var(--cerebro-fg)' }}
                >
                  {[...item.questions.before, ...item.questions.after].map(
                    (q, idx) => (
                      <li key={idx}>{q}</li>
                    ),
                  )}
                </ul>
              </div>
            )}

          <div>
            <h3
              className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--cerebro-muted)' }}
            >
              {t('review.context')}
            </h3>
            <ul
              className="mt-1.5 list-disc pl-5 text-sm"
              style={{ color: 'var(--cerebro-muted)' }}
            >
              {contextPrompts.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>

          <Button
            variant="secondary"
            onClick={() => onWriteFichamento(item)}
            data-testid="write-fichamento"
          >
            <FileText size={16} strokeWidth={1.85} />
            {t('study.fichamento.write')}
          </Button>

          <div>
            <h3
              className="mb-2 text-sm font-medium"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {t('review.howDidItGo')}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(['A', 'B', 'C'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={saving}
                  onClick={() => void mark(c)}
                  data-testid={`recall-${c}`}
                  className="flex flex-col items-center gap-1 rounded-[var(--radius-card)] px-2 py-3 text-center transition-transform duration-150 active:scale-[0.97]"
                  style={{
                    backgroundColor: 'var(--cerebro-raised)',
                    border: '1px solid var(--cerebro-border)',
                    color: 'var(--cerebro-fg)',
                  }}
                >
                  <span className="font-display text-lg font-semibold">
                    {c}
                  </span>
                  <span
                    className="text-[0.6875rem]"
                    style={{ color: 'var(--cerebro-muted)' }}
                  >
                    {t(`review.confidence.${c}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
