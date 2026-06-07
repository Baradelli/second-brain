import type {
  CalendarDayResponse,
  CalendarMonthResponse,
} from '@cerebro/shared';
import { Card } from '@cerebro/ui';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getCalendar } from '../lib/api/endpoints.js';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Mês corrente local ('YYYY-MM') — bom o bastante para abrir a tela. */
function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y as number, (m as number) - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function monthParts(month: string): { year: number; monthIndex: number } {
  const [y, m] = month.split('-').map(Number);
  return { year: y as number, monthIndex: (m as number) - 1 };
}

export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const navigate = useNavigate();

  const [month, setMonth] = useState<string>(currentMonthKey);
  const [data, setData] = useState<CalendarMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getCalendar(month)
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
  }, [month]);

  const { year, monthIndex } = monthParts(month);
  const monthTitle = new Date(year, monthIndex, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
  // Cabeçalho de dias da semana (domingo→sábado). 2024-06-02 é um domingo.
  const weekdayNames = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 5, 2 + i).toLocaleDateString(locale, { weekday: 'narrow' }),
  );
  const leadingBlanks = new Date(year, monthIndex, 1).getDay(); // 0=Dom..6=Sáb
  const today = todayKey();

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <div className="mb-5 flex items-center justify-between">
        <h1
          className="font-display text-[1.75rem] font-semibold leading-tight"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('calendar.title')}
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate('/recaps')}
            aria-label={t('nav.recaps')}
            data-testid="calendar-recaps"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--cerebro-accent-soft)]"
            style={{ color: 'var(--cerebro-muted)' }}
          >
            <CalendarRange size={18} strokeWidth={1.85} />
          </button>
          <button
            type="button"
            onClick={() => setMonth(currentMonthKey())}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--cerebro-accent-soft)]"
            style={{ color: 'var(--cerebro-accent)' }}
            data-testid="calendar-today"
          >
            {t('calendar.today')}
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label={t('calendar.prevMonth')}
          data-testid="calendar-prev"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--cerebro-accent-soft)]"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <span
          className="font-display text-base font-semibold capitalize"
          style={{ color: 'var(--cerebro-fg)' }}
          data-testid="calendar-month-title"
        >
          {monthTitle}
        </span>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          aria-label={t('calendar.nextMonth')}
          data-testid="calendar-next"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--cerebro-accent-soft)]"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </div>

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
        <Card padding="sm">
          <div className="grid grid-cols-7 gap-1">
            {weekdayNames.map((name, i) => (
              <div
                key={i}
                className="pb-1 text-center text-xs font-semibold uppercase"
                style={{ color: 'var(--cerebro-faint)' }}
              >
                {name}
              </div>
            ))}
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} aria-hidden />
            ))}
            {data.days.map((day) => (
              <DayCell
                key={day.date}
                day={day}
                isToday={day.date === today}
                onSelect={() => navigate(`/calendar/${day.date}`)}
              />
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}

function DayCell({
  day,
  isToday,
  onSelect,
}: {
  day: CalendarDayResponse;
  isToday: boolean;
  onSelect: () => void;
}) {
  const dayNumber = Number(day.date.slice(8, 10));
  const hasJournal = day.journal.devotional || day.journal.reflection;
  const hasGoals = day.goalsPlanned > 0 || day.goalsDone > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`calendar-day-${day.date}`}
      className="flex aspect-square flex-col items-center justify-start gap-0.5 rounded-lg p-1 text-center transition-colors hover:bg-[var(--cerebro-accent-soft)]"
      style={{
        border: isToday
          ? '1px solid var(--cerebro-accent)'
          : '1px solid transparent',
      }}
    >
      <span
        className="text-sm leading-none"
        style={{
          color: isToday ? 'var(--cerebro-accent)' : 'var(--cerebro-fg)',
          fontWeight: isToday ? 700 : 400,
        }}
      >
        {dayNumber}
      </span>
      {hasGoals && (
        <span
          className="text-[0.625rem] leading-none font-semibold"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {day.goalsPlanned > 0
            ? `${day.goalsDone}/${day.goalsPlanned}`
            : `${day.goalsDone}`}
        </span>
      )}
      {hasJournal && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'var(--cerebro-accent)' }}
          aria-hidden
        />
      )}
    </button>
  );
}
