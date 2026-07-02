import { docToText } from '../domain/doc-to-text.js';
import { NoteNotFoundError } from '../domain/errors.js';
import { extractMentionIds } from '../domain/extract-mention-ids.js';
import type { Note } from '../domain/note.js';
import type { NoteLinkRepository } from './ports/note-link-repository.js';
import type { NoteRepository } from './ports/note-repository.js';

export interface EditNoteInput {
  id: string;
  userId: string;
  title?: string;
  doc?: unknown;
  labelIds?: string[];
}

export class EditNote {
  constructor(
    private repo: NoteRepository,
    private links: NoteLinkRepository,
  ) {}

  async execute(input: EditNoteInput): Promise<Note> {
    const existing = await this.repo.byId(input.id);
    // Dono errado = NotFound (não vaza a existência). Tarefa 77.
    if (!existing || existing.userId !== input.userId)
      throw new NoteNotFoundError(input.id);

    const patch: Partial<Note> = {};

    if (input.title !== undefined) patch.title = input.title;
    if (input.labelIds !== undefined) patch.labelIds = input.labelIds;
    if (input.doc !== undefined) {
      patch.doc = input.doc;
      patch.plainText = docToText(input.doc);
    }

    const updated = await this.repo.update(input.id, patch);

    // Recomputa os links materializados só quando o doc mudou (a fonte das menções).
    // Ver ADR docs/adr/0001-note-link-materialized.md. Exclui auto-referência.
    if (input.doc !== undefined) {
      const toNoteIds = extractMentionIds(input.doc).filter(
        (id) => id !== updated.id,
      );
      await this.links.replaceOutgoing(updated.userId, updated.id, toNoteIds);
    }

    return updated;
  }
}
