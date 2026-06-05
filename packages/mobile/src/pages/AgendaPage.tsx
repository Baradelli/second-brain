import { Card, EmptyState, SectionHeader } from '@cerebro/ui';
import { ArrowRight, Check, Inbox, Moon, Sunrise, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { QuickCaptureForm } from '../components/QuickCaptureForm.js';
import {
  getAgenda,
  listActiveGoals,
  type TodayAgenda,
} from '../lib/api/endpoints.js';

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'agenda.greeting.morning';
  if (hour < 18) return 'agenda.greeting.afternoon';
  return 'agenda.greeting.evening';
}

// O backend manda o dia local como YYYY-MM-DD. `new Date('2026-06-04')` seria
// interpretado como meia-noite UTC e, exibido em fuso negativo (ex.: UTC-3),
// "voltaria" para o dia anterior. Por isso montamos a data com os componentes
// locais. O locale segue o idioma ativo do i18n (pt/en).
function formatDate(dateStr: string, locale: string): string {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const JOURNAL_CONFIG = {
  DEVOTIONAL: {
    color: 'var(--cerebro-devotional)',
    labelKey: 'editor.type.devotional',
    Icon: Sunrise,
  },
  REFLECTION: {
    color: 'var(--cerebro-reflection)',
    labelKey: 'editor.type.reflection',
    Icon: Moon,
  },
} as const;

export function AgendaPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [agenda, setAgenda] = useState<TodayAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeGoals, setActiveGoals] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
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

  useEffect(() => {
    let cancelled = false;
    listActiveGoals()
      .then((goals) => {
        if (!cancelled) setActiveGoals(goals.length);
      })
      .catch(() => {
        /* painel é secundário; silencioso se falhar */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-lg pb-24">
      {/* ── Greeting header ──────────────────────────────────────────── */}
      <header className="px-5 pt-8 pb-6">
        {agenda && (
          <p
            className="mb-1.5 text-xs font-semibold uppercase capitalize tracking-[0.14em]"
            style={{ color: 'var(--cerebro-accent)' }}
          >
            {formatDate(agenda.date, i18n.language)}
          </p>
        )}
        <h1
          className="font-display text-[2.1rem] font-semibold leading-[1.05]"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t(getGreetingKey())}
        </h1>
        <p
          className="mt-2.5 text-[0.95rem] italic leading-relaxed"
          style={{
            fontFamily: 'Fraunces, serif',
            color: 'var(--cerebro-muted)',
          }}
        >
          {t('agenda.greeting.subtitle')}
        </p>
      </header>

      {loading && (
        <div className="px-5">
          <LoadingDots />
        </div>
      )}

      {error && !loading && (
        <div className="px-5">
          <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
            {t('agenda.error')}
          </p>
        </div>
      )}

      {agenda && !loading && (
        <>
          {/* ── Journal section ────────────────────────────────────────── */}
          <section className="px-5 mb-7">
            <SectionHeader
              label={t('agenda.section.journal')}
              className="mb-3"
            />
            <div className="grid grid-cols-2 gap-3">
              <JournalCard
                type="DEVOTIONAL"
                done={agenda.journal.devotional.done}
                noteId={agenda.journal.devotional.noteId}
              />
              <JournalCard
                type="REFLECTION"
                done={agenda.journal.reflection.done}
                noteId={agenda.journal.reflection.noteId}
              />
            </div>
          </section>

          {/* ── Objetivos ativos (painel) ──────────────────────────────── */}
          <section className="px-5 mb-7">
            <button
              type="button"
              onClick={() => navigate('/goals')}
              data-testid="active-goals-panel"
              className="w-full text-left transition-transform duration-150 active:scale-[0.99]"
            >
              <Card padding="sm">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: 'var(--cerebro-accent-soft)',
                      color: 'var(--cerebro-accent)',
                    }}
                    aria-hidden
                  >
                    <Target size={18} strokeWidth={1.75} />
                  </span>
                  <p
                    className="flex-1 text-sm font-medium"
                    style={{ color: 'var(--cerebro-fg)' }}
                  >
                    {t('agenda.goals.active', { count: activeGoals })}
                  </p>
                  <ArrowRight
                    size={16}
                    strokeWidth={2.25}
                    style={{ color: 'var(--cerebro-muted)' }}
                  />
                </div>
              </Card>
            </button>

            <button
              type="button"
              onClick={() => navigate('/day-closing')}
              data-testid="day-closing-cta"
              className="mt-2.5 w-full text-left transition-transform duration-150 active:scale-[0.99]"
            >
              <Card padding="sm">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor:
                        'var(--cerebro-reflection-soft, var(--cerebro-accent-soft))',
                      color: 'var(--cerebro-reflection, var(--cerebro-accent))',
                    }}
                    aria-hidden
                  >
                    <Moon size={18} strokeWidth={1.75} />
                  </span>
                  <p
                    className="flex-1 text-sm font-medium"
                    style={{ color: 'var(--cerebro-fg)' }}
                  >
                    {t('agenda.dayClosing.cta')}
                  </p>
                  <ArrowRight
                    size={16}
                    strokeWidth={2.25}
                    style={{ color: 'var(--cerebro-muted)' }}
                  />
                </div>
              </Card>
            </button>
          </section>

          {/* ── Captures to review ─────────────────────────────────────── */}
          <section className="px-5 mb-7">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader label={t('agenda.section.captures')} />
              {agenda.capturesToReview.length > 0 && (
                <CapturesLink count={agenda.capturesToReview.length} showAll />
              )}
            </div>

            {agenda.capturesToReview.length === 0 ? (
              <EmptyState
                icon={<Inbox size={20} strokeWidth={1.75} />}
                title={t('agenda.captures.empty')}
              />
            ) : (
              <div className="space-y-2.5">
                {agenda.capturesToReview.slice(0, 3).map((c) => (
                  <CapturePreviewCard key={c.id} text={c.text} />
                ))}
              </div>
            )}
          </section>

          {/* ── Quick capture ───────────────────────────────────────────── */}
          <section className="px-5">
            <SectionHeader
              label={t('capture.section.input')}
              className="mb-3"
            />
            <QuickCaptureForm />
          </section>
        </>
      )}
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function JournalCard({
  type,
  done,
  noteId,
}: {
  type: 'DEVOTIONAL' | 'REFLECTION';
  done: boolean;
  noteId?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cfg = JOURNAL_CONFIG[type];
  const { Icon } = cfg;
  const href = noteId ? `/editor/${noteId}` : `/editor?type=${type}`;

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="group relative flex aspect-[5/6] flex-col justify-between overflow-hidden rounded-[var(--radius-card-lg)] p-4 text-left transition-all duration-200 active:scale-[0.97]"
      style={{
        backgroundColor: done
          ? `color-mix(in srgb, ${cfg.color} 12%, var(--cerebro-card))`
          : 'var(--cerebro-card)',
        border: `1px solid ${done ? `color-mix(in srgb, ${cfg.color} 38%, transparent)` : 'var(--cerebro-border)'}`,
        boxShadow: 'var(--cerebro-shadow-sm)',
      }}
      data-testid={`journal-card-${type.toLowerCase()}`}
      aria-label={`${t(cfg.labelKey)} — ${done ? t('agenda.journal.done') : t('agenda.journal.todo')}`}
    >
      <span
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{
          backgroundColor: `color-mix(in srgb, ${cfg.color} 16%, transparent)`,
          color: cfg.color,
        }}
      >
        <Icon size={20} strokeWidth={1.75} />
      </span>

      <div>
        <p
          className="font-display text-lg font-semibold leading-tight"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t(cfg.labelKey)}
        </p>
        {done ? (
          <span
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: cfg.color }}
          >
            <Check size={13} strokeWidth={3} />
            {t('agenda.journal.done')}
          </span>
        ) : (
          <span
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--cerebro-muted)' }}
          >
            {t('agenda.journal.todo')}
            <ArrowRight
              size={13}
              strokeWidth={2.25}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </span>
        )}
      </div>
    </button>
  );
}

function CapturePreviewCard({ text }: { text: string }) {
  const navigate = useNavigate();
  const firstLine = text.split('\n')[0] ?? text;
  const preview =
    firstLine.length > 80 ? `${firstLine.slice(0, 80)}…` : firstLine;
  return (
    <button
      type="button"
      onClick={() => navigate('/capture')}
      className="w-full text-left transition-transform duration-150 active:scale-[0.99]"
    >
      <Card padding="sm">
        <div className="flex items-start gap-3">
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: 'var(--cerebro-accent)' }}
            aria-hidden
          />
          <p
            className="text-sm leading-snug line-clamp-2"
            style={{ color: 'var(--cerebro-fg)' }}
          >
            {preview}
          </p>
        </div>
      </Card>
    </button>
  );
}

function CapturesLink({
  count,
  showAll = false,
}: {
  count: number;
  showAll?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/capture')}
      className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
      style={{ color: 'var(--cerebro-accent)' }}
    >
      {showAll ? t('agenda.captures.viewAll', { count }) : `${count}`}
      <ArrowRight size={13} strokeWidth={2.25} />
    </button>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1.5 py-8" aria-label="Carregando">
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
