import type { Resource } from '../../domain/resource.js';

export interface ResourceFilter {
  userId: string;
  stage?: Resource['stage'];
  status?: Resource['status'];
  labelId?: string;
}

export interface ResourceRepository {
  save(resource: Resource): Promise<Resource>;
  byId(id: string): Promise<Resource | null>;
  find(filter: ResourceFilter): Promise<Resource[]>;
  update(id: string, patch: Partial<Resource>): Promise<Resource>;
  delete(id: string): Promise<void>; // hard delete — só recursos arquivados e sem referências
}
