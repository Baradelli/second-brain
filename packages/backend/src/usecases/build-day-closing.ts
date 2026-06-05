import { DateTime } from 'luxon';

import type { EventRepository } from './ports/event-repository.js';
import type { GoalRepository } from './ports/goal-repository.js';
import type { SettingsReader } from './ports/settings-reader.js';
import { SelectTodaysGoals } from './select-todays-goals.js';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export interface BuildDayClosingInput {
  userId: string;
  reference: Date;
}

export type DayClosingKind = 'scheduled' | 'invitation';

export interface DayClosingItem {
  goalId: string;
  title: string;
  type: 'HABIT';
  kind: DayClosingKind;
  periodTarget?: number;
  periodDone?: number;
}

export interface DayClosing {
  date: string; // YYYY-MM-DD (dia local)
  pending: DayClosingItem[];
}

export class BuildDayClosing {
  private selector: SelectTodaysGoals;

  constructor(
    goals: GoalRepository,
    events: EventRepository,
    private settings: SettingsReader,
  ) {
    this.selector = new SelectTodaysGoals(goals, events);
  }

  async execute(input: BuildDayClosingInput): Promise<DayClosing> {
    const userSettings = await this.settings.getByUserId(input.userId);
    const timezone = userSettings?.timezone ?? DEFAULT_TIMEZONE;

    const date = DateTime.fromJSDate(input.reference, {
      zone: timezone,
    }).toFormat('yyyy-MM-dd');

    const items = await this.selector.execute({
      userId: input.userId,
      reference: input.reference,
      timezone,
    });

    const pending: DayClosingItem[] = items
      .filter((i) => !i.resolvedToday)
      .map((i) => ({
        goalId: i.goalId,
        title: i.title,
        type: 'HABIT' as const,
        kind: i.kind,
        ...(i.periodTarget !== undefined
          ? { periodTarget: i.periodTarget }
          : {}),
        ...(i.periodDone !== undefined ? { periodDone: i.periodDone } : {}),
      }))
      .sort(byKindThenTitle);

    return { date, pending };
  }
}

const KIND_ORDER: Record<DayClosingKind, number> = {
  scheduled: 0,
  invitation: 1,
};

function byKindThenTitle(a: DayClosingItem, b: DayClosingItem): number {
  const k = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  return k !== 0 ? k : a.title.localeCompare(b.title);
}
