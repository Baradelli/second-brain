import { DateTime } from 'luxon';

import { localDayKey, monthDayKeys } from '../domain/calendar-month.js';
import { dayRange } from '../domain/day-range.js';
import type { Goal } from '../domain/goal.js';
import { localWeekday } from '../domain/local-weekday.js';
import type { EventRepository } from './ports/event-repository.js';
import type { GoalRepository } from './ports/goal-repository.js';
import type { NoteRepository } from './ports/note-repository.js';
import type { SettingsReader } from './ports/settings-reader.js';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export interface BuildMonthCalendarInput {
  userId: string;
  month?: string; // 'YYYY-MM'; ausente → mês de `reference`
  reference?: Date; // default new Date() (resolve o mês corrente)
}

export interface CalendarDay {
  date: string; // 'YYYY-MM-DD' (dia local)
  goalsPlanned: number;
  goalsDone: number;
  journal: { devotional: boolean; reflection: boolean };
}

export interface MonthCalendar {
  month: string; // 'YYYY-MM'
  days: CalendarDay[];
}

/**
 * Agrega, por dia local do mês: metas previstas (HABIT de dias fixos agendados no dia) ×
 * cumpridas (objetivos distintos com `done` no dia) + selo de diário (devocional/reflexão).
 * Só leitura. Uma busca de objetivos, uma de eventos e duas de notas — agrupa em memória.
 */
export class BuildMonthCalendar {
  constructor(
    private goals: GoalRepository,
    private events: EventRepository,
    private notes: NoteRepository,
    private settings: SettingsReader,
  ) {}

  async execute(input: BuildMonthCalendarInput): Promise<MonthCalendar> {
    const userSettings = await this.settings.getByUserId(input.userId);
    const timezone = userSettings?.timezone ?? DEFAULT_TIMEZONE;

    const reference = input.reference ?? new Date();
    const month =
      input.month ??
      DateTime.fromJSDate(reference, { zone: timezone }).toFormat('yyyy-MM');

    // Âncora do mês no fuso (dia 1) para a janela [from, to].
    const monthRef = DateTime.fromFormat(month, 'yyyy-MM', { zone: timezone });
    if (!monthRef.isValid) {
      throw new Error(`Invalid month: ${month}`);
    }
    const range = dayRange(monthRef.toJSDate(), timezone, 'MONTH');

    const habits = await this.goals.find({
      userId: input.userId,
      status: 'ACTIVE',
      type: 'HABIT',
    });
    const habitIds = new Set(habits.map((g) => g.id));

    const doneEvents = await this.events.find({
      userId: input.userId,
      type: 'done',
      from: range.from,
      to: range.to,
    });
    // dia → objetivos distintos com done naquele dia (só hábitos carregados).
    const doneByDay = new Map<string, Set<string>>();
    for (const ev of doneEvents) {
      if (!habitIds.has(ev.goalId)) continue;
      const key = localDayKey(ev.occurredAt, timezone);
      const set = doneByDay.get(key) ?? new Set<string>();
      set.add(ev.goalId);
      doneByDay.set(key, set);
    }

    const [devotionalNotes, reflectionNotes] = await Promise.all([
      this.notes.find({
        userId: input.userId,
        type: 'DEVOTIONAL',
        status: 'ACTIVE',
        from: range.from,
        to: range.to,
      }),
      this.notes.find({
        userId: input.userId,
        type: 'REFLECTION',
        status: 'ACTIVE',
        from: range.from,
        to: range.to,
      }),
    ]);
    const devotionalDays = new Set(
      devotionalNotes.map((n) => localDayKey(n.date, timezone)),
    );
    const reflectionDays = new Set(
      reflectionNotes.map((n) => localDayKey(n.date, timezone)),
    );

    const days: CalendarDay[] = monthDayKeys(month, timezone).map((date) => ({
      date,
      goalsPlanned: this.countPlanned(habits, date, timezone),
      goalsDone: doneByDay.get(date)?.size ?? 0,
      journal: {
        devotional: devotionalDays.has(date),
        reflection: reflectionDays.has(date),
      },
    }));

    return { month, days };
  }

  /** Hábitos de dias fixos agendados em `date`, dentro da janela de existência do objetivo. */
  private countPlanned(habits: Goal[], date: string, timezone: string): number {
    const weekday = localWeekday(
      DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: timezone }).toJSDate(),
      timezone,
    );
    return habits.filter((g) => {
      if (g.weekdays.length === 0 || !g.weekdays.includes(weekday)) return false;
      const start = localDayKey(g.startAt ?? g.createdAt, timezone);
      if (date < start) return false;
      if (g.completedAt && date > localDayKey(g.completedAt, timezone)) {
        return false;
      }
      return true;
    }).length;
  }
}
