import type { NoteScope, NoteType } from '@cerebro/shared';

import { dayRange } from '../domain/day-range.js';
import type { Note } from '../domain/note.js';
import type { NoteRepository } from './ports/note-repository.js';

export interface FindNoteOfTheDayInput {
  userId: string;
  type: NoteType;
  scope?: NoteScope;
  reference: Date;
  timezone: string;
  weekStartsOn?: number; // 0=Sun, 1=Mon (default), ..., 6=Sat
}

export class FindNoteOfTheDay {
  constructor(private repo: NoteRepository) {}

  async execute(input: FindNoteOfTheDayInput): Promise<Note | null> {
    const scope = input.scope ?? 'DAY';
    const { from, to } = dayRange(
      input.reference,
      input.timezone,
      scope,
      input.weekStartsOn ?? 1,
    );

    const notes = await this.repo.find({
      userId: input.userId,
      type: input.type,
      scope,
      from,
      to,
      status: 'ACTIVE',
    });

    if (notes.length === 0) return null;

    return notes.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
  }
}
