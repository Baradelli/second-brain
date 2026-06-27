import type {
  Publication,
  PublicationFormat,
  PublicationStage,
} from '../domain/publication.js';
import type { PublicationRepository } from './ports/publication-repository.js';

export interface ListPublicationsInput {
  userId: string;
  stage?: PublicationStage;
  format?: PublicationFormat;
  status?: 'ACTIVE' | 'ARCHIVED'; // default 'ACTIVE'
}

export class ListPublications {
  constructor(private repo: PublicationRepository) {}

  async execute(input: ListPublicationsInput): Promise<Publication[]> {
    return this.repo.find({
      userId: input.userId,
      status: input.status ?? 'ACTIVE',
      ...(input.stage ? { stage: input.stage } : {}),
      ...(input.format ? { format: input.format } : {}),
    });
  }
}
