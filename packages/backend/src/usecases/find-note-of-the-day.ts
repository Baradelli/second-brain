import type { NoteType, NoteScope } from '@cerebro/shared';
import { dayRange } from '../domain/day-range.js';
import type { Note } from '../domain/note.js';
import type { NoteRepository } from './ports/note-repository.js';

export interface FindNoteOfTheDayInput {
  userId: string;
  type: NoteType;
  scope?: NoteScope;
  reference: Date;
  timezone: string;
}

export class FindNoteOfTheDay {
  constructor(private repo: NoteRepository) {}

  async execute(input: FindNoteOfTheDayInput): Promise<Note | null> {
    const scope = input.scope ?? 'DAY';
    const { from, to } = dayRange(input.reference, input.timezone, scope);

    const notes = await this.repo.find({
      userId: input.userId,
      type: input.type,
      scope,
      from,
      to,
      status: 'ACTIVE',
    });

    if (notes.length === 0) return null;

    // Return most recent if somehow multiple exist (uniqueness enforced in Task 06)
    return notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }
}
