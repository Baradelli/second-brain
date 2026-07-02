import { NoteNotFoundError } from '../domain/errors.js';
import type { Note } from '../domain/note.js';
import type { NoteRepository } from './ports/note-repository.js';

export interface ArchiveNoteInput {
  id: string;
  userId: string;
  archivedAt?: Date; // default: now
}

/** Soft delete de nota: status ARCHIVED + archivedAt (sai das listagens ACTIVE). */
export class ArchiveNote {
  constructor(private repo: NoteRepository) {}

  async execute(input: ArchiveNoteInput): Promise<Note> {
    const existing = await this.repo.byId(input.id);
    // Dono errado = NotFound (não vaza a existência). Tarefa 77.
    if (!existing || existing.userId !== input.userId)
      throw new NoteNotFoundError(input.id);

    return this.repo.update(input.id, {
      status: 'ARCHIVED',
      archivedAt: input.archivedAt ?? new Date(),
    });
  }
}
