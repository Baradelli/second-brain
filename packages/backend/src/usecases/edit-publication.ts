import {
  InvalidPublicationError,
  PublicationNotFoundError,
} from '../domain/errors.js';
import {
  type Publication,
  PUBLICATION_FORMATS,
  PUBLICATION_STAGES,
  type PublicationFormat,
  type PublicationStage,
} from '../domain/publication.js';
import type { PublicationRepository } from './ports/publication-repository.js';

export interface EditPublicationInput {
  id: string;
  userId: string; // owner; editing another user's publication is rejected as not-found
  title?: string;
  format?: PublicationFormat;
  stage?: PublicationStage;
  noteId?: string | null;
  labelIds?: string[]; // if present, REPLACES the current set
  publishedAt?: Date; // clock injection; defaults to now when first reaching published
}

export class EditPublication {
  constructor(private repo: PublicationRepository) {}

  async execute(input: EditPublicationInput): Promise<Publication> {
    const existing = await this.repo.byId(input.id);
    // not-found also covers wrong owner: never leak existence across users
    if (!existing || existing.userId !== input.userId) {
      throw new PublicationNotFoundError(input.id);
    }

    const patch: Partial<Publication> = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length === 0) {
        throw new InvalidPublicationError('title must not be empty');
      }
      patch.title = title;
    }
    if (input.format !== undefined) {
      if (!PUBLICATION_FORMATS.includes(input.format)) {
        throw new InvalidPublicationError(`unknown format '${input.format}'`);
      }
      patch.format = input.format;
    }
    if (input.stage !== undefined) {
      if (!PUBLICATION_STAGES.includes(input.stage)) {
        throw new InvalidPublicationError(`unknown stage '${input.stage}'`);
      }
      patch.stage = input.stage;
      // First time it reaches "published", stamp publishedAt. Once set, it stays
      // (history): leaving and re-entering published never overwrites it.
      if (
        input.stage === 'published' &&
        existing.publishedAt === null &&
        patch.publishedAt === undefined
      ) {
        patch.publishedAt = input.publishedAt ?? new Date();
      }
    }
    if (input.noteId !== undefined) patch.noteId = input.noteId;
    if (input.labelIds !== undefined) patch.labelIds = input.labelIds;

    // status/archivedAt are intentionally never touched here (archive is separate).

    return this.repo.update(input.id, patch);
  }
}
