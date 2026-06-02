import type { NoteScope,NoteType } from '@cerebro/shared';

import { dayRange } from '../domain/day-range.js';
import { NotAJournalTypeError } from '../domain/errors.js';
import type { Note } from '../domain/note.js';
import type { CreateNote } from './create-note.js';
import type { EditNote } from './edit-note.js';
import type { FindNoteOfTheDay } from './find-note-of-the-day.js';

const JOURNAL_TYPES: NoteType[] = ['DEVOTIONAL', 'REFLECTION'];

export interface UpsertJournalNoteInput {
  userId: string;
  type: NoteType;
  scope?: NoteScope;
  reference: Date;
  timezone: string;
  title?: string;
  doc: unknown;
  mode?: 'create-or-get' | 'create-or-update';
  weekStartsOn?: number; // 0=Sun, 1=Mon (default), ..., 6=Sat
}

export class UpsertJournalNote {
  constructor(
    private findNoteOfTheDay: FindNoteOfTheDay,
    private createNote: CreateNote,
    private editNote: EditNote,
  ) {}

  async execute(input: UpsertJournalNoteInput): Promise<{ note: Note; created: boolean }> {
    if (!JOURNAL_TYPES.includes(input.type)) {
      throw new NotAJournalTypeError(input.type);
    }

    const scope = input.scope ?? 'DAY';
    const mode = input.mode ?? 'create-or-get';
    const weekStartsOn = input.weekStartsOn ?? 1;

    const existing = await this.findNoteOfTheDay.execute({
      userId: input.userId,
      type: input.type,
      scope,
      reference: input.reference,
      timezone: input.timezone,
      weekStartsOn,
    });

    if (!existing) {
      const { from } = dayRange(input.reference, input.timezone, scope, weekStartsOn);
      const note = await this.createNote.execute({
        userId: input.userId,
        type: input.type,
        scope,
        date: from,
        title: input.title,
        doc: input.doc,
      });
      return { note, created: true };
    }

    if (mode === 'create-or-update') {
      const note = await this.editNote.execute({
        id: existing.id,
        title: input.title,
        doc: input.doc,
      });
      return { note, created: false };
    }

    return { note: existing, created: false };
  }
}
