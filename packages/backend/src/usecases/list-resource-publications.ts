import type { Publication } from '../domain/publication.js';
import type { NoteRepository } from './ports/note-repository.js';
import type { PublicationRepository } from './ports/publication-repository.js';
import type { StudyItemRepository } from './ports/study-item-repository.js';

export interface ListResourcePublicationsInput {
  userId: string;
  resourceId: string;
}

/**
 * Publicações que "nasceram" de um recurso (visão transitiva): as feitas direto
 * do recurso (`sourceType='resource'`) MAIS as feitas a partir de itens de estudo
 * ou notas daquele recurso. O vínculo de Publication é polimórfico
 * (`sourceType`/`sourceId`, sem FK), então cruzamos aqui no UseCase. `recap` não
 * pertence a um recurso, então é ignorado. Traz só publicações ACTIVE; notas e
 * itens de estudo são considerados em qualquer status (um post de fonte arquivada
 * ainda nasceu daquele recurso).
 */
export class ListResourcePublications {
  constructor(
    private publications: PublicationRepository,
    private studyItems: StudyItemRepository,
    private notes: NoteRepository,
  ) {}

  async execute(input: ListResourcePublicationsInput): Promise<Publication[]> {
    const [studyItems, notes, publications] = await Promise.all([
      this.studyItems.find({
        userId: input.userId,
        resourceId: input.resourceId,
      }),
      this.notes.find({ userId: input.userId, resourceId: input.resourceId }),
      this.publications.find({ userId: input.userId, status: 'ACTIVE' }),
    ]);

    const studyItemIds = new Set(studyItems.map((s) => s.id));
    const noteIds = new Set(notes.map((n) => n.id));

    return publications.filter((p) => {
      switch (p.sourceType) {
        case 'resource':
          return p.sourceId === input.resourceId;
        case 'study_item':
          return studyItemIds.has(p.sourceId);
        case 'note':
          return noteIds.has(p.sourceId);
        default:
          return false;
      }
    });
  }
}
