import type { Resource, ResourceStage } from '../domain/resource.js';
import type { ResourceRepository } from './ports/resource-repository.js';

export interface ListResourcesInput {
  userId: string;
  stage?: ResourceStage;
  labelId?: string;
  status?: 'ACTIVE' | 'ARCHIVED'; // default 'ACTIVE'
}

export class ListResources {
  constructor(private repo: ResourceRepository) {}

  async execute(input: ListResourcesInput): Promise<Resource[]> {
    return this.repo.find({
      userId: input.userId,
      status: input.status ?? 'ACTIVE',
      ...(input.stage ? { stage: input.stage } : {}),
      ...(input.labelId ? { labelId: input.labelId } : {}),
    });
  }
}
