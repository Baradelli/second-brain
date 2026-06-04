import { Card, EmptyState, SectionHeader } from '@cerebro/ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { QuickCaptureForm } from '../components/QuickCaptureForm.js';
import { getAgenda, type TodayAgenda } from '../lib/api/endpoints.js';

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'agenda.greeting.morning';
  if (hour < 18) return 'agenda.greeting.afternoon';
  return 'agenda.greeting.evening';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const JOURNAL_CONFIG = {
  DEVOTIONAL: { color: '#C17D41', labelKey: 'editor.type.devotional' },
  REFLECTION: { color: '#6D5DFC', labelKey: 'editor.type.reflection' },
} as const;

export function AgendaPage() {
  const { t } = useTranslation();
  const [agenda, setAgenda] = useState<TodayAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getAgenda()
      .then((data) => { if (!cancelled) setAgenda(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main
      className="min-h-dvh pb-24"
      style={{ backgroundColor: 'var(--cerebro-bg)' }}
    >
      {/* ── Greeting header ──────────────────────────────────────────── */}
      <header className="px-5 pt-6 pb-5">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--cerebro-fg)', letterSpacing: '-0.025em' }}
        >
          {t(getGreetingKey())}
        </h1>
        {agenda && (
          <p
            className="mt-0.5 text-sm capitalize"
            style={{ color: 'var(--cerebro-muted)' }}
          >
            {formatDate(agenda.date)}
          </p>
        )}
        <p
          className="mt-2 text-sm leading-relaxed"
          style={{
            fontFamily: 'Georgia, ui-serif, serif',
            fontStyle: 'italic',
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
          <section className="px-4 mb-6">
            <SectionHeader label={t('agenda.section.journal')} className="mb-3" />
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

          {/* ── Captures to review ─────────────────────────────────────── */}
          <section className="px-4 mb-6">
            <div className="mb-3 flex items-center justify-between">
              <SectionHeader label={t('agenda.section.captures')} />
              {agenda.capturesToReview.length > 0 && (
                <CapturesLink count={agenda.capturesToReview.length} />
              )}
            </div>

            {agenda.capturesToReview.length === 0 ? (
              <EmptyState title={t('agenda.captures.empty')} />
            ) : (
              <div className="space-y-2">
                {agenda.capturesToReview.slice(0, 3).map((c) => (
                  <CapturePreviewCard key={c.id} text={c.text} />
                ))}
                {agenda.capturesToReview.length > 3 && (
                  <CapturesLink count={agenda.capturesToReview.length} showAll />
                )}
              </div>
            )}
          </section>

          {/* ── Quick capture ───────────────────────────────────────────── */}
          <section className="px-4">
            <SectionHeader label={t('capture.section.input')} className="mb-3" />
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
  const href = noteId ? `/editor/${noteId}` : `/editor?type=${type}`;

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition-all duration-150 active:scale-[0.97] w-full"
      style={{
        backgroundColor: done
          ? `color-mix(in srgb, ${cfg.color} 10%, var(--cerebro-card))`
          : 'var(--cerebro-card)',
        border: `1px solid ${done ? cfg.color + '40' : 'var(--cerebro-border)'}`,
      }}
      data-testid={`journal-card-${type.toLowerCase()}`}
      aria-label={`${t(cfg.labelKey)} — ${done ? t('agenda.journal.done') : t('agenda.journal.todo')}`}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: cfg.color }}
          aria-hidden
        />
        <span
          className="text-[0.6rem] font-bold uppercase tracking-[0.12em]"
          style={{ color: cfg.color }}
        >
          {t(cfg.labelKey)}
        </span>
      </div>
      {done ? (
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--cerebro-fg)', opacity: 0.65 }}
        >
          ✓ {t('agenda.journal.done')}
        </span>
      ) : (
        <span className="text-xs" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.journal.todo')}
        </span>
      )}
    </button>
  );
}

function CapturePreviewCard({ text }: { text: string }) {
  const firstLine = text.split('\n')[0] ?? text;
  const preview = firstLine.length > 80 ? `${firstLine.slice(0, 80)}…` : firstLine;
  return (
    <Card padding="sm">
      <p
        className="text-sm leading-snug line-clamp-2"
        style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
      >
        {preview}
      </p>
    </Card>
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
      className="text-xs font-medium transition-opacity hover:opacity-70"
      style={{ color: 'var(--cerebro-accent)' }}
    >
      {showAll
        ? t('agenda.captures.viewAll', { count })
        : `${count}`}
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
