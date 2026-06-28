import {
  type AgendaGoal,
  checkGoal,
  createNote,
  getAgenda,
  getTodayNote,
  skipGoal,
  type TodayAgenda,
} from '@cerebro/shared/client';
import { Button, Card, EmptyState, SectionHeader } from '@cerebro/ui';
import {
  Brain,
  Check,
  Inbox,
  Moon,
  SkipForward,
  Sunrise,
  Target,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';
import { formatAgendaDate, greetingKeyForHour } from './agenda-display.js';

/** Doc TipTap vazio — usado ao criar a nota do ritual sob demanda. */
const EMPTY_DOC = { type: 'doc', content: [] } as const;

const RITUALS = {
  DEVOTIONAL: { labelKey: 'editor.type.devotional', Icon: Sunrise },
  REFLECTION: { labelKey: 'editor.type.reflection', Icon: Moon },
} as const;

type RitualType = keyof typeof RITUALS;

/**
 * Aba "Hoje" (Agenda) do desktop. Agrega ritual (devocional/reflexão), objetivos
 * de hoje, capturas pendentes e revisões due — espelhando o `AgendaPage` do mobile
 * e reusando os mesmos endpoints de `@cerebro/shared/client`. O "que dia é hoje"
 * já vem resolvido do backend (timezone do Settings); aqui só exibimos e agimos.
 */
export function AgendaTab() {
  const { t, i18n } = useTranslation();
  const { openTab } = useTabs();

  const [agenda, setAgenda] = useState<TodayAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setError(false);
    const data = await getAgenda();
    setAgenda(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAgenda()
      .then((data) => {
        if (!cancelled) setAgenda(data);
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

  // Abre (ou cria, se ainda não existe) a nota do ritual de hoje numa aba.
  // Mesma intenção do mobile: tenta achar a nota do dia; se não há, cria uma
  // vazia (mesmos endpoints `getTodayNote`/`createNote`). A aba se auto-titula.
  const openRitual = useCallback(
    async (type: RitualType, existingNoteId?: string) => {
      let id = existingNoteId;
      if (!id) {
        const today = await getTodayNote(type);
        id =
          today?.id ?? (await createNote({ type, doc: { ...EMPTY_DOC } })).id;
      }
      openTab({ kind: 'note', id, title: t(RITUALS[type].labelKey) });
      // A nota nova passa a contar como "feito hoje" — atualiza a agenda.
      void refresh().catch(() => undefined);
    },
    [openTab, refresh, t],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('agenda.loading')}</p>
      </div>
    );
  }

  if (error || !agenda) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('agenda.error')}</p>
      </div>
    );
  }

  const isAllClear =
    agenda.goals.length === 0 &&
    agenda.capturesToReview.length === 0 &&
    agenda.recallsDue.length === 0;

  return (
    <div className="mx-auto h-full max-w-2xl overflow-auto px-6 pb-16">
      <header className="pt-10 pb-7">
        <p className="mb-1.5 text-xs font-semibold uppercase capitalize tracking-[0.14em] text-accent">
          {formatAgendaDate(agenda.date, i18n.language)}
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-fg">
          {t(greetingKeyForHour(new Date().getHours()))}
        </h1>
        <p className="font-serif mt-2.5 text-base italic leading-relaxed text-muted">
          {t('agenda.greeting.subtitle')}
        </p>
      </header>

      {/* ── Ritual (diário) ─────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader label={t('agenda.section.journal')} className="mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <RitualCard
            type="DEVOTIONAL"
            done={agenda.journal.devotional.done}
            onOpen={() =>
              void openRitual('DEVOTIONAL', agenda.journal.devotional.noteId)
            }
          />
          <RitualCard
            type="REFLECTION"
            done={agenda.journal.reflection.done}
            onOpen={() =>
              void openRitual('REFLECTION', agenda.journal.reflection.noteId)
            }
          />
        </div>
      </section>

      {/* ── Objetivos de hoje ───────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionHeader label={t('agenda.section.goals')} className="mb-3" />
        {agenda.goals.length === 0 ? (
          <EmptyState
            icon={<Target size={20} strokeWidth={1.75} />}
            title={t('agenda.goals.empty')}
          />
        ) : (
          <div className="space-y-2.5">
            {agenda.goals.map((goal) => (
              <GoalRow
                key={goal.goalId}
                goal={goal}
                onChanged={() => void refresh().catch(() => setError(true))}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Capturas pendentes → abre a Revisão (triagem, Fase 1.3) ─────── */}
      <section className="mb-8">
        <SectionHeader label={t('agenda.section.captures')} className="mb-3" />
        {agenda.capturesToReview.length === 0 ? (
          <EmptyState
            icon={<Inbox size={20} strokeWidth={1.75} />}
            title={t('agenda.captures.empty')}
          />
        ) : (
          <div className="space-y-2.5">
            {agenda.capturesToReview.map((capture) => (
              <Card key={capture.id} padding="sm">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                    aria-hidden
                  />
                  <p className="line-clamp-2 text-sm leading-snug text-fg">
                    {firstLine(capture.text)}
                  </p>
                </div>
              </Card>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                openTab({
                  kind: 'review',
                  id: 'review',
                  title: t('review.title'),
                })
              }
              data-testid="agenda-open-review"
            >
              {t('agenda.captures.viewAll', {
                count: agenda.capturesToReview.length,
              })}
            </Button>
          </div>
        )}
      </section>

      {/* ── Revisões de hoje (display-only; recall é Fase 2) ────────────── */}
      <section className="mb-4">
        <SectionHeader label={t('agenda.section.reviews')} className="mb-3" />
        {agenda.recallsDue.length === 0 ? (
          <EmptyState
            icon={<Brain size={20} strokeWidth={1.75} />}
            title={t('agenda.reviews.empty')}
          />
        ) : (
          <div className="space-y-2.5">
            {agenda.recallsDue.map((recall) => (
              <Card key={recall.studyItemId} padding="sm">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted"
                    aria-hidden
                  >
                    <Brain size={17} strokeWidth={1.75} />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                    {recall.title}
                  </p>
                  {recall.overdue && (
                    <span className="shrink-0 text-[0.6875rem] font-semibold text-error">
                      {t('agenda.reviews.overdue')}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {isAllClear && (
        <p className="font-serif mt-6 text-center text-sm italic text-muted">
          {t('agenda.empty.allClear')}
        </p>
      )}
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

/** Primeira linha não vazia de uma captura, truncada para preview. */
function firstLine(text: string): string {
  const line =
    text
      .split('\n')
      .find((l) => l.trim())
      ?.trim() ?? text;
  return line.length > 90 ? `${line.slice(0, 90)}…` : line;
}

function RitualCard({
  type,
  done,
  onOpen,
}: {
  type: RitualType;
  done: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const { Icon, labelKey } = RITUALS[type];
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`ritual-${type.toLowerCase()}`}
      aria-label={`${t(labelKey)} — ${done ? t('agenda.journal.done') : t('agenda.journal.todo')}`}
      className={`group flex flex-col gap-3 rounded-[var(--radius-card)] border p-4 text-left transition-colors hover:bg-card ${
        done ? 'border-accent/40 bg-card' : 'border-subtle'
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-accent">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <div>
        <p className="font-display text-base font-semibold leading-tight text-fg">
          {t(labelKey)}
        </p>
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted">
          {done ? (
            <>
              <Check size={13} strokeWidth={3} className="text-accent" />
              {t('agenda.journal.done')}
            </>
          ) : (
            t('agenda.journal.todo')
          )}
        </span>
      </div>
    </button>
  );
}

function GoalRow({
  goal,
  onChanged,
}: {
  goal: AgendaGoal;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [reason, setReason] = useState('');

  async function handleCheck() {
    setBusy(true);
    try {
      await checkGoal(goal.goalId);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await skipGoal(goal.goalId, trimmed);
      setSkipping(false);
      setReason('');
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-accent"
          aria-hidden
        >
          <Target size={17} strokeWidth={1.75} />
        </span>
        <p
          className={`min-w-0 flex-1 truncate text-sm font-medium ${
            goal.resolvedToday ? 'text-muted line-through' : 'text-fg'
          }`}
        >
          {goal.title}
        </p>

        {goal.resolvedToday ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted">
            <Check size={14} strokeWidth={2.5} className="text-accent" />
            {t('agenda.goals.doneToday')}
          </span>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSkipping(true)}
              disabled={busy}
              aria-label={t('agenda.goals.skip')}
              data-testid={`goal-skip-${goal.goalId}`}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised disabled:opacity-45"
            >
              <SkipForward size={16} strokeWidth={1.85} />
            </button>
            <Button
              size="sm"
              onClick={() => void handleCheck()}
              disabled={busy}
              aria-label={t('agenda.goals.check')}
              data-testid={`goal-check-${goal.goalId}`}
            >
              <Check size={16} strokeWidth={2.5} />
            </Button>
          </div>
        )}
      </div>

      {skipping && !goal.resolvedToday && (
        <div className="mt-3 flex flex-col gap-2.5 border-t border-subtle pt-3">
          <label
            className="text-xs font-medium text-muted"
            htmlFor={`skip-${goal.goalId}`}
          >
            {t('agenda.goals.skip.reasonTitle')}
          </label>
          <input
            id={`skip-${goal.goalId}`}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('agenda.goals.skip.reasonPlaceholder')}
            data-testid={`goal-skip-reason-${goal.goalId}`}
            className="h-10 w-full rounded-[var(--radius-card)] border border-subtle bg-raised px-3.5 text-sm text-fg outline-none placeholder:text-faint"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSkipping(false);
                setReason('');
              }}
              disabled={busy}
            >
              {t('agenda.goals.skip.cancel')}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleSkip()}
              disabled={busy || reason.trim() === ''}
              data-testid={`goal-skip-confirm-${goal.goalId}`}
            >
              {t('agenda.goals.skip.confirm')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
