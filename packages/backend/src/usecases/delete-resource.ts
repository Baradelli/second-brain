import {
  ResourceHasReferencesError,
  ResourceNotArchivedError,
  ResourceNotFoundError,
} from '../domain/errors.js';
import type { Resource } from '../domain/resource.js';
import type { HighlightRepository } from './ports/highlight-repository.js';
import type { NoteRepository } from './ports/note-repository.js';
import type { ResourceRepository } from './ports/resource-repository.js';
import type { StudyItemRepository } from './ports/study-item-repository.js';

export interface DeleteResourceInput {
  id: string;
  userId: string; // dono; senão ResourceNotFoundError (não vaza)
}

/**
 * Hard delete de um recurso arquivado. Bloqueado se houver notas ou itens de
 * estudo apontando para ele. Ver docs/adr/0004-politica-de-exclusao.md.
 */
export class DeleteResource {
  constructor(
    private resources: ResourceRepository,
    private notes: NoteRepository,
    private studyItems: StudyItemRepository,
    private highlights: HighlightRepository,
  ) {}

  async execute(input: DeleteResourceInput): Promise<Resource> {
    const existing = await this.resources.byId(input.id);
    if (!existing || existing.userId !== input.userId) {
      throw new ResourceNotFoundError(input.id);
    }

    if (existing.status !== 'ARCHIVED') {
      throw new ResourceNotArchivedError(input.id);
    }

    const notes = await this.notes.find({
      userId: input.userId,
      resourceId: input.id,
    });
    if (notes.length > 0) {
      throw new ResourceHasReferencesError('notes', notes.length);
    }

    const studyItems = await this.studyItems.find({
      userId: input.userId,
      resourceId: input.id,
    });
    if (studyItems.length > 0) {
      throw new ResourceHasReferencesError('studyItems', studyItems.length);
    }

    const highlights = await this.highlights.find({
      userId: input.userId,
      resourceId: input.id,
    });
    if (highlights.length > 0) {
      throw new ResourceHasReferencesError('highlights', highlights.length);
    }

    await this.resources.delete(input.id);
    return existing;
  }
}
