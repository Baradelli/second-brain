import type {
  CalendarDayDetailResponse,
  CalendarDayGoalResponse,
  CalendarDayNoteResponse,
  CalendarMonthResponse,
  NoteType,
} from '@cerebro/shared';
import { getCalendar, getDayDetail } from '@cerebro/shared/client';
import { Button, Card, EmptyState } from '@cerebro/ui';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Moon,
  NotebookText,
  SkipForward,
  Target,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';
import {
  buildMonthGrid,
  currentMonthKey,
  dayHasGoals,
  dayHasJournal,
  dayNumber,
  longDateLabel,
  monthTitle,
  shiftMonth,
  todayKey,
  weekdayNarrowNames,
} from './calendar-grid.js';
import { DayClosingPanel } from './DayClosingPanel.js';

const NOTE_TYPE_KEY: Record<NoteType, string> = {
  DEVOTIONAL: 'editor.type.devotional',
  REFLECTION: 'editor.type.reflection',
  STUDY_NOTE: 'editor.type.study',
  NOTE: 'editor.type.note',
};

/**
 * Aba "Calendário" do desktop. Mostra a grade do mês (atividade por dia: metas
 * previstas × cumpridas + selo de diário) com navegação prev/next, e, ao clicar
 * num dia, abre o detalhe daquele dia num painel ao lado da grade — reusando os
 * endpoints `getCalendar`/`getDayDetail` do shared (mesma semântica do mobile,
 * sem duplicar lógica). A matemática de mês/grade é pura/testada (Luxon, nunca
 * `new Date`). O dia local já vem resolvido do backend (timezone do Settings).
 * O ritual "Fechar o dia" fica acessível por uma ação no topo da aba.
 */
export function CalendarTab() {
  const { t, i18n } = useTranslation();
  const { openTab } = useTabs();
  const locale = i18n.language;

  const [month, setMonth] = useState<string>(() => currentMonthKey());
  const [data, setData] = useState<CalendarMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const loadMonth = useCallback(() => {
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

  useEffect(() => loadMonth(), [loadMonth]);

  const today = todayKey();
  const grid = data ? buildMonthGrid(month, data.days) : [];
  const weekdays = weekdayNarrowNames(locale);

  return (
    <div className="page-wide h-full overflow-auto px-6 pb-16 sm:px-8">
      <header className="flex items-center justify-between pt-8 pb-5">
        <h1 className="font-display text-3xl font-semibold capitalize leading-tight text-fg">
          {t('calendar.title')}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setClosing((v) => !v)}
            aria-pressed={closing}
            data-testid="calendar-close-day"
          >
            <Moon size={15} strokeWidth={1.85} />
            {t('calendar.day.closeDay')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMonth(currentMonthKey());
              setSelectedDate(today);
            }}
            data-testid="calendar-today"
          >
            {t('calendar.today')}
          </Button>
        </div>
      </header>

      {closing && (
        <Card className="mb-6">
          <h2 className="font-display text-lg font-semibold text-fg">
            {t('dayClosing.title')}
          </h2>
          <p className="font-serif mb-3 mt-1 text-sm italic text-muted">
            {t('dayClosing.subtitle')}
          </p>
          <DayClosingPanel onResolved={loadMonth} />
        </Card>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* ── Grade do mês ──────────────────────────────────────────────── */}
        <section className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label={t('calendar.prevMonth')}
              data-testid="calendar-prev"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-card"
            >
              <ChevronLeft size={20} strokeWidth={1.75} />
            </button>
            <span
              className="font-display text-base font-semibold capitalize text-fg"
              data-testid="calendar-month-title"
            >
              {monthTitle(month, locale)}
            </span>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, 1))}
              aria-label={t('calendar.nextMonth')}
              data-testid="calendar-next"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-card"
            >
              <ChevronRight size={20} strokeWidth={1.75} />
            </button>
          </div>

          {loading && <p className="text-sm text-muted">{t('calendar.loading')}</p>}
          {error && !loading && (
            <p className="text-sm text-muted">{t('calendar.error')}</p>
          )}

          {!loading && !error && data && (
            <Card padding="sm">
              <div className="grid grid-cols-7 gap-1">
                {weekdays.map((name, i) => (
                  <div
                    key={i}
                    className="pb-1 text-center text-xs font-semibold uppercase text-faint"
                  >
                    {name}
                  </div>
                ))}
                {grid.map((cell) =>
                  cell.day === null ? (
                    <div key={cell.key} aria-hidden />
                  ) : (
                    <DayCell
                      key={cell.key}
                      date={cell.day.date}
                      number={dayNumber(cell.day.date)}
                      goalsPlanned={cell.day.goalsPlanned}
                      goalsDone={cell.day.goalsDone}
                      hasGoals={dayHasGoals(cell.day)}
                      hasJournal={dayHasJournal(cell.day)}
                      isToday={cell.day.date === today}
                      isSelected={cell.day.date === selectedDate}
                      onSelect={() => setSelectedDate(cell.day?.date ?? null)}
                    />
                  ),
                )}
              </div>
            </Card>
          )}
        </section>

        {/* ── Detalhe do dia selecionado ────────────────────────────────── */}
        <aside className="lg:w-96 lg:flex-shrink-0">
          {selectedDate ? (
            <DayDetail
              date={selectedDate}
              onOpenNote={(id, title) =>
                openTab({ kind: 'note', id, title })
              }
            />
          ) : (
            <EmptyState title={t('calendar.detail.empty')} />
          )}
        </aside>
      </div>
    </div>
  );
}

function DayCell({
  date,
  number,
  goalsPlanned,
  goalsDone,
  hasGoals,
  hasJournal,
  isToday,
  isSelected,
  onSelect,
}: {
  date: string;
  number: number;
  goalsPlanned: number;
  goalsDone: number;
  hasGoals: boolean;
  hasJournal: boolean;
  isToday: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`calendar-day-${date}`}
      aria-pressed={isSelected}
      className={`flex aspect-square flex-col items-center justify-start gap-0.5 rounded-lg border p-1 text-center transition-colors hover:bg-card ${
        isSelected
          ? 'border-accent bg-card'
          : isToday
            ? 'border-accent/60'
            : 'border-transparent'
      }`}
    >
      <span
        className={`text-sm leading-none ${
          isToday ? 'font-bold text-accent' : 'text-fg'
        }`}
      >
        {number}
      </span>
      {hasGoals && (
        <span className="text-[0.625rem] font-semibold leading-none text-muted">
          {goalsPlanned > 0 ? `${goalsDone}/${goalsPlanned}` : `${goalsDone}`}
        </span>
      )}
      {hasJournal && (
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      )}
    </button>
  );
}

/**
 * Detalhe de um dia: metas (com status) + notas escritas no dia. Reusa
 * `getDayDetail` do shared. As notas abrem na aba de edição ao clicar.
 */
function DayDetail({
  date,
  onOpenNote,
}: {
  date: string;
  onOpenNote: (id: string, title: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [detail, setDetail] = useState<CalendarDayDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getDayDetail(date)
      .then((res) => {
        if (!cancelled) setDetail(res);
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

  return (
    <Card>
      <h2 className="mb-4 font-display text-base font-semibold capitalize leading-snug text-fg">
        {longDateLabel(date, i18n.language)}
      </h2>

      {loading && <p className="text-sm text-muted">{t('calendar.loading')}</p>}
      {error && !loading && (
        <p className="text-sm text-muted">{t('calendar.error')}</p>
      )}

      {!loading && !error && detail && (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-faint">
              {t('calendar.day.goalsSection')}
            </h3>
            {detail.goals.length === 0 ? (
              <EmptyState
                icon={<Target size={18} strokeWidth={1.75} />}
                title={t('calendar.day.noGoals')}
              />
            ) : (
              <div className="space-y-1.5" data-testid="day-goals">
                {detail.goals.map((g) => (
                  <GoalRow key={g.goalId} goal={g} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-faint">
              {t('calendar.day.notesSection')}
            </h3>
            {detail.notes.length === 0 ? (
              <EmptyState
                icon={<NotebookText size={18} strokeWidth={1.75} />}
                title={t('calendar.day.noNotes')}
              />
            ) : (
              <div className="space-y-1.5" data-testid="day-notes">
                {detail.notes.map((n) => (
                  <NoteRow key={n.id} note={n} onOpen={onOpenNote} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Card>
  );
}

function GoalRow({ goal }: { goal: CalendarDayGoalResponse }) {
  const { t } = useTranslation();
  const icon =
    goal.status === 'done' ? (
      <Check size={13} strokeWidth={3} className="text-accent" />
    ) : goal.status === 'skipped' ? (
      <SkipForward size={13} strokeWidth={2.5} className="text-muted" />
    ) : (
      <Circle size={13} strokeWidth={2.5} className="text-faint" />
    );
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--radius-card)] border border-subtle px-3 py-2">
      <span
        className="flex items-center gap-1.5 text-xs font-semibold text-muted"
        data-testid={`goal-status-${goal.status}`}
      >
        {icon}
        {t(`calendar.day.status.${goal.status}`)}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
        {goal.title}
      </p>
    </div>
  );
}

function NoteRow({
  note,
  onOpen,
}: {
  note: CalendarDayNoteResponse;
  onOpen: (id: string, title: string) => void;
}) {
  const { t } = useTranslation();
  const title = note.title?.trim() || t('notes.untitled');
  return (
    <button
      type="button"
      onClick={() => onOpen(note.id, title)}
      data-testid={`day-note-${note.id}`}
      className="w-full rounded-[var(--radius-card)] border border-subtle px-3 py-2 text-left transition-colors hover:bg-card"
    >
      <p className="truncate text-sm font-medium text-fg">{title}</p>
      <p className="text-xs text-muted">{t(NOTE_TYPE_KEY[note.type])}</p>
    </button>
  );
}
