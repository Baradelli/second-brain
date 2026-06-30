import {
  NoteHasReferencesError,
  NoteNotArchivedError,
  NoteNotFoundError,
} from '../domain/errors.js';
import type { Note } from '../domain/note.js';
import type { AttachmentRepository } from './ports/attachment-repository.js';
import type { NoteLinkRepository } from './ports/note-link-repository.js';
import type { NoteRepository } from './ports/note-repository.js';
import type { PublicationRepository } from './ports/publication-repository.js';
import type { StudyItemRepository } from './ports/study-item-repository.js';

export interface DeleteNoteInput {
  id: string;
  userId: string; // dono; senão NoteNotFoundError (não vaza)
}

/**
 * Hard delete de uma nota arquivada. Bloqueado se houver referência forte:
 * outras notas a mencionam (backlinks), anexos, fichamento de study item, ou
 * rascunho de publicação. Ver docs/adr/0004-politica-de-exclusao.md.
 */
export class DeleteNote {
  constructor(
    private notes: NoteRepository,
    private links: NoteLinkRepository,
    private attachments: AttachmentRepository,
    private studyItems: StudyItemRepository,
    private publications: PublicationRepository,
  ) {}

  async execute(input: DeleteNoteInput): Promise<Note> {
    const existing = await this.notes.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new NoteNotFoundError(input.id);
    }

    if (existing.status !== 'ARCHIVED') {
      throw new NoteNotArchivedError(input.id);
    }

    const backlinks = await this.links.listBacklinks(input.userId, input.id);
    if (backlinks.length > 0) {
      throw new NoteHasReferencesError('backlinks', backlinks.length);
    }

    const attachments = await this.attachments.listByNote(input.id);
    if (attachments.length > 0) {
      throw new NoteHasReferencesError('attachments', attachments.length);
    }

    const fichamentos = (
      await this.studyItems.find({ userId: input.userId })
    ).filter((item) => item.fichamentoNoteId === input.id);
    if (fichamentos.length > 0) {
      throw new NoteHasReferencesError('studyItem', fichamentos.length);
    }

    const drafts = (
      await this.publications.find({ userId: input.userId })
    ).filter((pub) => pub.noteId === input.id);
    if (drafts.length > 0) {
      throw new NoteHasReferencesError('draft', drafts.length);
    }

    // Sem referências: limpa os links de saída (no-op se já vazio) e apaga a nota.
    await this.links.replaceOutgoing(input.userId, input.id, []);
    await this.notes.delete(input.id);
    return existing;
  }
}
