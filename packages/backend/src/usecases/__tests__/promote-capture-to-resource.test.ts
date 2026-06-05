import { beforeEach, describe, expect, it } from 'vitest';

import type { Capture } from '../../domain/capture.js';
import {
  CaptureAlreadyProcessedError,
  CaptureNotFoundError,
} from '../../domain/errors.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { ResourceRepositoryFake } from '../_fakes/resource-repository-fake.js';
import { CreateResource } from '../create-resource.js';
import { PromoteCaptureToResource } from '../promote-capture-to-resource.js';

const USER = 'user-1';

function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: 'cap-1',
    userId: USER,
    text: 'Domain-Driven Design',
    status: 'PENDING',
    reviewAt: null,
    processedAt: null,
    promotedToType: null,
    promotedToId: null,
    archivedAt: null,
    archiveReason: null,
    labelIds: ['l1'],
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PromoteCaptureToResource', () => {
  let captures: CaptureRepositoryFake;
  let resources: ResourceRepositoryFake;
  let useCase: PromoteCaptureToResource;

  beforeEach(() => {
    captures = new CaptureRepositoryFake();
    resources = new ResourceRepositoryFake();
    useCase = new PromoteCaptureToResource(
      captures,
      new CreateResource(resources),
    );
  });

  it('creates a resource (title defaults to text, inherits labels) and marks capture PROCESSED', async () => {
    await captures.save(makeCapture());

    const { resource, capture } = await useCase.execute({
      captureId: 'cap-1',
      type: 'book',
    });

    expect(resource.title).toBe('Domain-Driven Design');
    expect(resource.type).toBe('book');
    expect(resource.stage).toBe('backlog');
    expect(resource.labelIds).toEqual(['l1']);

    expect(capture.status).toBe('PROCESSED');
    expect(capture.promotedToType).toBe('resource');
    expect(capture.promotedToId).toBe(resource.id);
  });

  it('uses provided title over capture text', async () => {
    await captures.save(makeCapture());
    const { resource } = await useCase.execute({
      captureId: 'cap-1',
      type: 'course',
      title: 'Curso de DDD',
    });
    expect(resource.title).toBe('Curso de DDD');
  });

  it('throws for unknown capture', async () => {
    await expect(
      useCase.execute({ captureId: 'ghost', type: 'book' }),
    ).rejects.toThrow(CaptureNotFoundError);
  });

  it('throws when capture is not PENDING', async () => {
    await captures.save(makeCapture({ status: 'PROCESSED' }));
    await expect(
      useCase.execute({ captureId: 'cap-1', type: 'book' }),
    ).rejects.toThrow(CaptureAlreadyProcessedError);
  });
});
