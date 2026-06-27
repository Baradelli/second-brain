import type { Publication } from '../../domain/publication.js';

export interface PublicationFilter {
  userId: string;
  stage?: Publication['stage'];
  format?: Publication['format'];
  status?: Publication['status'];
}

export interface PublicationRepository {
  save(publication: Publication): Promise<Publication>;
  byId(id: string): Promise<Publication | null>;
  find(filter: PublicationFilter): Promise<Publication[]>;
  update(id: string, patch: Partial<Publication>): Promise<Publication>;
}
