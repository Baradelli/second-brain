import { beforeEach, describe, expect, it } from 'vitest';

import type { Attachment } from '../../domain/attachment.js';
import type { Capture } from '../../domain/capture.js';
import {
  CaptureHasReferencesError,
  CaptureNotArchivedError,
  CaptureNotFoundError,
} from '../../domain/errors.js';
import { AttachmentRepositoryFake } from '../_fakes/attachment-repository-fake.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { DeleteCapture } from '../delete-capture.js';

const USER = 'user-1';

function makeCapture(overrides?: Partial<Capture>): Capture {
  return {
    id: 'c1',
    userId: USER,
    text: 'ideia',
    status: 'ARCHIVED',
    reviewAt: null,
    processedAt: null,
    promotedToType: null,
    promotedToId: null,
    archivedAt: new Date('2026-06-03T00:00:00.000Z'),
    archiveReason: null,
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

function makeAttachment(captureId: string): Attachment {
  return {
    id: 'a1',
    userId: USER,
    url: 'https://x/y.png',
    type: 'image',
    mimeType: null,
    name: null,
    size: null,
    transcription: null,
    ocrStatus: null,
    noteId: null,
    captureId,
    createdAt: new Date('2026-06-02T11:00:00.000Z'),
  };
}

describe('DeleteCapture', () => {
  let captures: CaptureRepositoryFake;
  let attachments: AttachmentRepositoryFake;
  let useCase: DeleteCapture;

  beforeEach(() => {
    captures = new CaptureRepositoryFake();
    attachments = new AttachmentRepositoryFake();
    useCase = new DeleteCapture(captures, attachments);
  });

  it('apaga uma captura arquivada sem anexos', async () => {
    await captures.save(makeCapture());

    const result = await useCase.execute({ id: 'c1', userId: USER });

    expect(result.id).toBe('c1');
    expect(await captures.byId('c1')).toBeNull();
  });

  it('recusa se a captura não está arquivada', async () => {
    await captures.save(makeCapture({ status: 'PENDING', archivedAt: null }));

    await expect(useCase.execute({ id: 'c1', userId: USER })).rejects.toThrow(
      CaptureNotArchivedError,
    );
  });

  it('recusa se há anexos', async () => {
    await captures.save(makeCapture());
    await attachments.save(makeAttachment('c1'));

    await expect(useCase.execute({ id: 'c1', userId: USER })).rejects.toThrow(
      CaptureHasReferencesError,
    );
    expect(await captures.byId('c1')).not.toBeNull();
  });

  it('não apaga captura de outro usuário', async () => {
    await captures.save(makeCapture({ userId: 'other' }));

    await expect(useCase.execute({ id: 'c1', userId: USER })).rejects.toThrow(
      CaptureNotFoundError,
    );
  });
});
