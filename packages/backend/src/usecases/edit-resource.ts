import {
  InvalidResourceError,
  ResourceNotFoundError,
} from '../domain/errors.js';
import {
  RESOURCE_STAGES,
  RESOURCE_TYPES,
  type Resource,
  type ResourceStage,
  type ResourceType,
} from '../domain/resource.js';
import type { ResourceRepository } from './ports/resource-repository.js';

export interface EditResourceInput {
  id: string;
  userId: string; // owner; editing another user's resource is rejected as not-found
  title?: string;
  type?: ResourceType;
  url?: string | null;
  author?: string | null;
  description?: string | null;
  stage?: ResourceStage;
  labelIds?: string[]; // if present, REPLACES the current set
}

export class EditResource {
  constructor(private repo: ResourceRepository) {}

  async execute(input: EditResourceInput): Promise<Resource> {
    const existing = await this.repo.byId(input.id);
    // not-found also covers wrong owner: never leak existence across users
    if (!existing || existing.userId !== input.userId) {
      throw new ResourceNotFoundError(input.id);
    }

    const patch: Partial<Resource> = {};

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (title.length === 0) {
        throw new InvalidResourceError('title must not be empty');
      }
      patch.title = title;
    }
    if (input.type !== undefined) {
      if (!RESOURCE_TYPES.includes(input.type)) {
        throw new InvalidResourceError(`unknown type '${input.type}'`);
      }
      patch.type = input.type;
    }
    if (input.stage !== undefined) {
      if (!RESOURCE_STAGES.includes(input.stage)) {
        throw new InvalidResourceError(`unknown stage '${input.stage}'`);
      }
      patch.stage = input.stage;
    }
    if (input.url !== undefined) patch.url = input.url;
    if (input.author !== undefined) patch.author = input.author;
    if (input.description !== undefined) patch.description = input.description;
    if (input.labelIds !== undefined) patch.labelIds = input.labelIds;

    // status/archivedAt are intentionally never touched here (archive is separate).

    return this.repo.update(input.id, patch);
  }
}
