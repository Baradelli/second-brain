import { DateTime } from 'luxon';

import type { Capture } from '../domain/capture.js';
import { DEFAULT_TIMEZONE } from '../domain/settings.js';
import { FindNoteOfTheDay } from './find-note-of-the-day.js';
import { ListPendingCaptures } from './list-pending-captures.js';
import type { SettingsReader } from './ports/settings-reader.js';
import type { DueRecallItem } from './select-due-recalls.js';
import { SelectDueRecalls } from './select-due-recalls.js';
import { SelectTodaysGoals } from './select-todays-goals.js';

export interface BuildTodayAgendaInput {
  userId: string;
  reference: Date;
}

export interface AgendaGoal {
  goalId: string;
  title: string;
  kind: 'scheduled' | 'invitation';
  resolvedToday: boolean;
}

export interface TodayAgenda {
  date: string; // YYYY-MM-DD local day
  journal: {
    devotional: { done: boolean; noteId?: string };
    reflection: { done: boolean; noteId?: string };
  };
  capturesToReview: Capture[];
  goals: AgendaGoal[];
  recallsDue: DueRecallItem[];
}

export class BuildTodayAgenda {
  constructor(
    private settings: SettingsReader,
    private findNoteOfTheDay: FindNoteOfTheDay,
    private listPendingCaptures: ListPendingCaptures,
    private selectTodaysGoals: SelectTodaysGoals,
    private selectDueRecalls: SelectDueRecalls,
  ) {}

  async execute(input: BuildTodayAgendaInput): Promise<TodayAgenda> {
    const userSettings = await this.settings.getByUserId(input.userId);
    // Fallback único do app (Tarefa 75) — nunca UTC.
    const timezone = userSettings?.timezone ?? DEFAULT_TIMEZONE;

    const date = DateTime.fromJSDate(input.reference, {
      zone: timezone,
    }).toFormat('yyyy-MM-dd');

    const noteInput = {
      userId: input.userId,
      reference: input.reference,
      timezone,
      weekStartsOn: userSettings?.recapWeekday,
    };

    const [
      devotionalNote,
      reflectionNote,
      capturesToReview,
      todaysGoals,
      recallsDue,
    ] = await Promise.all([
      this.findNoteOfTheDay.execute({ ...noteInput, type: 'DEVOTIONAL' }),
      this.findNoteOfTheDay.execute({ ...noteInput, type: 'REFLECTION' }),
      this.listPendingCaptures.execute(noteInput),
      this.selectTodaysGoals.execute(noteInput),
      this.selectDueRecalls.execute(noteInput),
    ]);

    return {
      date,
      journal: {
        devotional: devotionalNote
          ? { done: true, noteId: devotionalNote.id }
          : { done: false },
        reflection: reflectionNote
          ? { done: true, noteId: reflectionNote.id }
          : { done: false },
      },
      capturesToReview,
      goals: todaysGoals.map((g) => ({
        goalId: g.goalId,
        title: g.title,
        kind: g.kind,
        resolvedToday: g.resolvedToday,
      })),
      recallsDue,
    };
  }
}
