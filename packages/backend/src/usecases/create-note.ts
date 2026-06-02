import { randomUUID } from 'node:crypto';
import { createNoteSchema } from '@cerebro/shared';
import { docToText } from '../domain/doc-to-text.js';
import type { Note } from '../domain/note.js';
import type { NoteRepository } from './ports/note-repository.js';

export class CreateNote {
  constructor(private repo: NoteRepository) {}

  async execute(input: unknown): Promise<Note> {
    const data = createNoteSchema.parse(input);

    const note: Note = {
      id: randomUUID(),
      userId: data.userId,
      type: data.type,
      scope: data.scope,
      date: data.date,
      title: data.title,
      doc: data.doc,
      plainText: docToText(data.doc),
      goalId: data.goalId,
      resourceId: data.resourceId,
      eventId: data.eventId,
      labelIds: data.labelIds,
      status: 'ACTIVE',
      createdAt: new Date(),
    };

    return this.repo.save(note);
  }
}
