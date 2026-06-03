import { DateTime } from 'luxon';

import type { Capture } from '../domain/capture.js';
import { FindNoteOfTheDay } from './find-note-of-the-day.js';
import { ListPendingCaptures } from './list-pending-captures.js';
import type { SettingsReader } from './ports/settings-reader.js';

export interface BuildTodayAgendaInput {
  userId: string;
  reference: Date;
}

export interface TodayAgenda {
  date: string; // YYYY-MM-DD local day
  journal: {
    devotional: { done: boolean; noteId?: string };
    reflection: { done: boolean; noteId?: string };
  };
  capturesToReview: Capture[];
}

// When the user has no Settings configured, fall back to UTC so the UseCase
// never throws — the UI can prompt the user to configure their timezone later.
const DEFAULT_TIMEZONE = 'UTC';

export class BuildTodayAgenda {
  constructor(
    private settings: SettingsReader,
    private findNoteOfTheDay: FindNoteOfTheDay,
    private listPendingCaptures: ListPendingCaptures,
  ) {}

  async execute(input: BuildTodayAgendaInput): Promise<TodayAgenda> {
    const userSettings = await this.settings.getByUserId(input.userId);
    const timezone = userSettings?.timezone ?? DEFAULT_TIMEZONE;

    const date = DateTime.fromJSDate(input.reference, {
      zone: timezone,
    }).toFormat('yyyy-MM-dd');

    const noteInput = {
      userId: input.userId,
      reference: input.reference,
      timezone,
    };

    const [devotionalNote, reflectionNote, capturesToReview] =
      await Promise.all([
        this.findNoteOfTheDay.execute({ ...noteInput, type: 'DEVOTIONAL' }),
        this.findNoteOfTheDay.execute({ ...noteInput, type: 'REFLECTION' }),
        this.listPendingCaptures.execute(noteInput),
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
    };
  }
}
