import { randomUUID } from 'node:crypto';

import { InvalidResourceError } from '../domain/errors.js';
import {
  RESOURCE_TYPES,
  type Resource,
  type ResourceType,
} from '../domain/resource.js';
import type { ResourceRepository } from './ports/resource-repository.js';

export interface CreateResourceInput {
  userId: string;
  title: string;
  type: ResourceType;
  url?: string | null;
  author?: string | null;
  description?: string | null;
  labelIds?: string[];
}

export class CreateResource {
  constructor(private repo: ResourceRepository) {}

  async execute(input: CreateResourceInput): Promise<Resource> {
    const title = input.title?.trim() ?? '';
    if (title.length === 0) {
      throw new InvalidResourceError('title must not be empty');
    }
    if (!RESOURCE_TYPES.includes(input.type)) {
      throw new InvalidResourceError(`unknown type '${input.type}'`);
    }

    const resource: Resource = {
      id: randomUUID(),
      userId: input.userId,
      title,
      type: input.type,
      url: input.url ?? null,
      author: input.author ?? null,
      description: input.description ?? null,
      stage: 'backlog',
      status: 'ACTIVE',
      archivedAt: null,
      createdAt: new Date(),
      labelIds: input.labelIds ?? [],
    };

    return this.repo.save(resource);
  }
}
