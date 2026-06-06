import type {
  CalendarDayDetailResponse,
  CalendarDayGoalResponse,
  CalendarDayNoteResponse,
  NoteType,
} from '@cerebro/shared';
import { Button, Card, EmptyState } from '@cerebro/ui';
import {
  Check,
  ChevronLeft,
  Circle,
  NotebookText,
  SkipForward,
  Target,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { getDayDetail } from '../lib/api/endpoints.js';

const NOTE_TYPE_KEY: Record<NoteType, string> = {
  DEVOTIONAL: 'editor.type.devotional',
  REFLECTION: 'editor.type.reflection',
  STUDY_NOTE: 'editor.type.study',
  NOTE: 'editor.type.note',
};

function todayKey(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function DayDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { date = '' } = useParams();

  const [data, setData] = useState<CalendarDayDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getDayDetail(date)
      .then((res) => {
        if (!cancelled) setData(res);
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
  }, [date]);

  const [y, m, d] = date.split('-').map(Number);
  const longDate =
    y && m && d
      ? new Date(y, m - 1, d).toLocaleDateString(i18n.language, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : date;

  const isToday = date === todayKey();
  const hasPending = data?.goals.some((g) => g.status === 'pending') ?? false;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-6 pb-24">
      <button
        type="button"
        onClick={() => navigate('/calendar')}
        aria-label={t('calendar.day.back')}
        data-testid="day-back"
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--cerebro-accent-soft)]"
        style={{ color: 'var(--cerebro-muted)' }}
      >
        <ChevronLeft size={20} strokeWidth={1.75} />
      </button>

      <h1
        className="mb-5 font-display text-[1.6rem] font-semibold capitalize leading-tight"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {longDate}
      </h1>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('calendar.loading')}
        </p>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('calendar.error')}
        </p>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          <section>
            <h2
              className="mb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--cerebro-faint)' }}
            >
              {t('calendar.day.goalsSection')}
            </h2>
            {data.goals.length === 0 ? (
              <EmptyState
                icon={<Target size={20} strokeWidth={1.75} />}
                title={t('calendar.day.noGoals')}
              />
            ) : (
              <div className="space-y-2" data-testid="day-goals">
                {data.goals.map((g) => (
                  <GoalRow key={g.goalId} goal={g} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2
              className="mb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--cerebro-faint)' }}
            >
              {t('calendar.day.notesSection')}
            </h2>
            {data.notes.length === 0 ? (
              <EmptyState
                icon={<NotebookText size={20} strokeWidth={1.75} />}
                title={t('calendar.day.noNotes')}
              />
            ) : (
              <div className="space-y-2" data-testid="day-notes">
                {data.notes.map((n) => (
                  <NoteRow
                    key={n.id}
                    note={n}
                    onOpen={() => navigate(`/editor/${n.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          {isToday && hasPending && (
            <Button
              variant="secondary"
              onClick={() => navigate('/day-closing')}
              data-testid="day-close-cta"
            >
              {t('calendar.day.closeDay')}
            </Button>
          )}
        </div>
      )}
    </main>
  );
}

function GoalRow({ goal }: { goal: CalendarDayGoalResponse }) {
  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <StatusBadge status={goal.status} />
        <p
          className="min-w-0 flex-1 truncate text-sm font-medium"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {goal.title}
        </p>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: CalendarDayGoalResponse['status'] }) {
  const { t } = useTranslation();
  const map = {
    done: {
      icon: <Check size={13} strokeWidth={3} />,
      color: 'var(--cerebro-accent)',
      bg: 'var(--cerebro-accent)',
      fg: 'var(--cerebro-bg)',
    },
    skipped: {
      icon: <SkipForward size={13} strokeWidth={2.5} />,
      color: 'var(--cerebro-muted)',
      bg: 'transparent',
      fg: 'var(--cerebro-muted)',
    },
    pending: {
      icon: <Circle size={13} strokeWidth={2.5} />,
      color: 'var(--cerebro-muted)',
      bg: 'transparent',
      fg: 'var(--cerebro-faint)',
    },
  } as const;
  const s = map[status];
  return (
    <span
      className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor:
          status === 'done' ? 'var(--cerebro-accent-soft)' : 'transparent',
        border:
          status === 'done' ? 'none' : '1px solid var(--cerebro-border)',
        color: s.color,
      }}
      data-testid={`goal-status-${status}`}
    >
      {s.icon}
      {t(`calendar.day.status.${status}`)}
    </span>
  );
}

function NoteRow({
  note,
  onOpen,
}: {
  note: CalendarDayNoteResponse;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const title = note.title?.trim() || t('notes.untitled');
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`day-note-${note.id}`}
      className="w-full text-left"
    >
      <Card padding="sm">
        <p
          className="truncate text-sm font-medium"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {title}
        </p>
        <p className="text-xs" style={{ color: 'var(--cerebro-muted)' }}>
          {t(NOTE_TYPE_KEY[note.type])}
        </p>
      </Card>
    </button>
  );
}
