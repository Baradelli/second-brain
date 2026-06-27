import { randomUUID } from 'node:crypto';

import { InvalidPublicationError } from '../domain/errors.js';
import {
  type Publication,
  PUBLICATION_FORMATS,
  PUBLICATION_SOURCE_TYPES,
  type PublicationFormat,
  type PublicationSourceType,
} from '../domain/publication.js';
import type { PublicationRepository } from './ports/publication-repository.js';

export interface CreatePublicationInput {
  userId: string;
  sourceType: PublicationSourceType;
  sourceId: string;
  format: PublicationFormat;
  title: string;
  noteId?: string | null;
  labelIds?: string[];
}

export class CreatePublication {
  constructor(private repo: PublicationRepository) {}

  async execute(input: CreatePublicationInput): Promise<Publication> {
    const title = input.title?.trim() ?? '';
    if (title.length === 0) {
      throw new InvalidPublicationError('title must not be empty');
    }
    const sourceId = input.sourceId?.trim() ?? '';
    if (sourceId.length === 0) {
      throw new InvalidPublicationError('sourceId must not be empty');
    }
    if (!PUBLICATION_SOURCE_TYPES.includes(input.sourceType)) {
      throw new InvalidPublicationError(
        `unknown sourceType '${input.sourceType}'`,
      );
    }
    if (!PUBLICATION_FORMATS.includes(input.format)) {
      throw new InvalidPublicationError(`unknown format '${input.format}'`);
    }

    const publication: Publication = {
      id: randomUUID(),
      userId: input.userId,
      sourceType: input.sourceType,
      sourceId,
      format: input.format,
      stage: 'idea',
      title,
      noteId: input.noteId ?? null,
      publishedAt: null,
      status: 'ACTIVE',
      archivedAt: null,
      createdAt: new Date(),
      labelIds: input.labelIds ?? [],
    };

    return this.repo.save(publication);
  }
}
