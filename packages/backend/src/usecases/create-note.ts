import { randomUUID } from 'node:crypto';

import { createNoteSchema } from '@cerebro/shared';

import { docToText } from '../domain/doc-to-text.js';
import { extractMentionIds } from '../domain/extract-mention-ids.js';
import type { Note } from '../domain/note.js';
import type { NoteLinkRepository } from './ports/note-link-repository.js';
import type { NoteRepository } from './ports/note-repository.js';

export class CreateNote {
  constructor(
    private repo: NoteRepository,
    private links: NoteLinkRepository,
  ) {}

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

    const saved = await this.repo.save(note);

    // Grafo materializado: persiste os links de saída derivados das menções do doc
    // (ver ADR docs/adr/0001-note-link-materialized.md). Exclui auto-referência.
    const toNoteIds = extractMentionIds(saved.doc).filter(
      (id) => id !== saved.id,
    );
    await this.links.replaceOutgoing(saved.userId, saved.id, toNoteIds);

    return saved;
  }
}
