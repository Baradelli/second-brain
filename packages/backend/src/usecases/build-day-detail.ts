import type { NoteType } from '@cerebro/shared';
import { DateTime } from 'luxon';

import { dayRange } from '../domain/day-range.js';
import { DEFAULT_TIMEZONE } from '../domain/settings.js';
import type { EventRepository } from './ports/event-repository.js';
import type { GoalRepository } from './ports/goal-repository.js';
import type { NoteRepository } from './ports/note-repository.js';
import type { SettingsReader } from './ports/settings-reader.js';
import {
  SelectTodaysGoals,
  type TodaysGoalKind,
} from './select-todays-goals.js';

export type DayDetailStatus = 'done' | 'skipped' | 'pending';

export interface BuildDayDetailInput {
  userId: string;
  date: string; // 'YYYY-MM-DD' (já validada na borda)
}

export interface DayDetailGoal {
  goalId: string;
  title: string;
  kind: TodaysGoalKind;
  status: DayDetailStatus;
}

export interface DayDetailNote {
  id: string;
  type: NoteType;
  title?: string;
}

export interface DayDetail {
  date: string;
  goals: DayDetailGoal[];
  notes: DayDetailNote[];
}

const KIND_ORDER: Record<TodaysGoalKind, number> = {
  scheduled: 0,
  invitation: 1,
};

/**
 * Detalhe de um dia: metas relevantes (via SelectTodaysGoals) com status feito/pulado/pendente
 * a partir dos eventos do dia, e as notas escritas no dia. Só leitura.
 */
export class BuildDayDetail {
  private selector: SelectTodaysGoals;

  constructor(
    goals: GoalRepository,
    private events: EventRepository,
    private notes: NoteRepository,
    private settings: SettingsReader,
  ) {
    this.selector = new SelectTodaysGoals(goals, events);
  }

  async execute(input: BuildDayDetailInput): Promise<DayDetail> {
    const userSettings = await this.settings.getByUserId(input.userId);
    const timezone = userSettings?.timezone ?? DEFAULT_TIMEZONE;

    // Meio-dia local evita borda de fuso ao montar o instante de referência.
    const reference = DateTime.fromFormat(input.date, 'yyyy-MM-dd', {
      zone: timezone,
    })
      .set({ hour: 12 })
      .toJSDate();
    const day = dayRange(reference, timezone, 'DAY');

    const items = await this.selector.execute({
      userId: input.userId,
      reference,
      timezone,
    });

    const dayEvents = await this.events.find({
      userId: input.userId,
      from: day.from,
      to: day.to,
    });
    const doneGoals = new Set(
      dayEvents.filter((e) => e.type === 'done').map((e) => e.goalId),
    );
    const skipGoals = new Set(
      dayEvents.filter((e) => e.type === 'skip').map((e) => e.goalId),
    );

    const goals: DayDetailGoal[] = items
      .map((i) => ({
        goalId: i.goalId,
        title: i.title,
        kind: i.kind,
        status: doneGoals.has(i.goalId)
          ? ('done' as const)
          : skipGoals.has(i.goalId)
            ? ('skipped' as const)
            : ('pending' as const),
      }))
      .sort((a, b) => {
        const k = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
        return k !== 0 ? k : a.title.localeCompare(b.title);
      });

    const dayNotes = await this.notes.find({
      userId: input.userId,
      status: 'ACTIVE',
      from: day.from,
      to: day.to,
    });
    const notes: DayDetailNote[] = dayNotes
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((n) => ({
        id: n.id,
        type: n.type,
        ...(n.title !== undefined ? { title: n.title } : {}),
      }));

    return { date: input.date, goals, notes };
  }
}
