import type { Capture } from '../domain/capture.js';
import type { Resource, ResourceType } from '../domain/resource.js';
import { CreateResource } from './create-resource.js';
import type { CaptureRepository } from './ports/capture-repository.js';
import { loadPendingCapture, markPromoted } from './promote-capture-shared.js';

export interface PromoteCaptureToResourceInput {
  captureId: string;
  title?: string; // default: capture.text (trim)
  type: ResourceType;
  url?: string | null;
  author?: string | null;
  description?: string | null;
}

export class PromoteCaptureToResource {
  constructor(
    private captureRepo: CaptureRepository,
    private createResource: CreateResource,
  ) {}

  async execute(
    input: PromoteCaptureToResourceInput,
  ): Promise<{ resource: Resource; capture: Capture }> {
    const capture = await loadPendingCapture(this.captureRepo, input.captureId);

    const resource = await this.createResource.execute({
      userId: capture.userId,
      title: input.title?.trim() || capture.text.trim(),
      type: input.type,
      url: input.url,
      author: input.author,
      description: input.description,
      labelIds: capture.labelIds,
    });

    const updatedCapture = await markPromoted(
      this.captureRepo,
      input.captureId,
      'resource',
      resource.id,
    );

    return { resource, capture: updatedCapture };
  }
}
