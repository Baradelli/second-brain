import type { Note } from '../domain/note.js';
import type { NoteLinkRepository } from './ports/note-link-repository.js';
import type { NoteRepository } from './ports/note-repository.js';

export interface ListBacklinksInput {
  userId: string;
  noteId: string;
}

/** Uma nota de origem que aponta para a nota-alvo (backlink), reduzida a id + título. */
export interface Backlink {
  id: string;
  title: string;
}

/**
 * Backlinks de uma nota: as notas ATIVAS do mesmo usuário cujo doc menciona `noteId`.
 * Lê do grafo materializado (NoteLink) e faz join com as notas para descartar links
 * pendentes (origem inexistente, arquivada ou de outro usuário).
 */
export class ListBacklinks {
  constructor(
    private notes: NoteRepository,
    private links: NoteLinkRepository,
  ) {}

  async execute(input: ListBacklinksInput): Promise<Backlink[]> {
    const backlinks = await this.links.listBacklinks(
      input.userId,
      input.noteId,
    );
    if (backlinks.length === 0) return [];

    const activeNotes = await this.notes.find({
      userId: input.userId,
      status: 'ACTIVE',
    });
    const byId = new Map<string, Note>(activeNotes.map((n) => [n.id, n]));

    const result: Backlink[] = [];
    const seen = new Set<string>();
    for (const link of backlinks) {
      if (seen.has(link.fromNoteId)) continue;
      const source = byId.get(link.fromNoteId);
      if (!source) continue; // dangling: source missing/archived/other-user
      seen.add(link.fromNoteId);
      result.push({ id: source.id, title: source.title ?? '' });
    }
    return result;
  }
}
