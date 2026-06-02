import { docToText } from '../domain/doc-to-text.js';
import { NoteNotFoundError } from '../domain/errors.js';
import type { Note } from '../domain/note.js';
import type { NoteRepository } from './ports/note-repository.js';

export interface EditNoteInput {
  id: string;
  title?: string;
  doc?: unknown;
  labelIds?: string[];
}

export class EditNote {
  constructor(private repo: NoteRepository) {}

  async execute(input: EditNoteInput): Promise<Note> {
    const existing = await this.repo.byId(input.id);
    if (!existing) throw new NoteNotFoundError(input.id);

    const patch: Partial<Note> = {};

    if (input.title !== undefined) patch.title = input.title;
    if (input.labelIds !== undefined) patch.labelIds = input.labelIds;
    if (input.doc !== undefined) {
      patch.doc = input.doc;
      patch.plainText = docToText(input.doc);
    }

    return this.repo.update(input.id, patch);
  }
}
