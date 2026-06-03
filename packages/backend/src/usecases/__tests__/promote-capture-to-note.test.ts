import { beforeEach, describe, expect, it } from 'vitest';

import { docToText } from '../../domain/doc-to-text.js';
import {
  CaptureAlreadyProcessedError,
  CaptureNotFoundError,
} from '../../domain/errors.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { CreateNote } from '../create-note.js';
import { PromoteCaptureToNote } from '../promote-capture-to-note.js';

const BASE_CAPTURE = {
  id: 'cap-1',
  userId: 'user-1',
  text: 'pesquisar sobre Stoicismo',
  url: undefined,
  status: 'PENDING' as const,
  reviewAt: new Date('2026-06-10T12:00:00.000Z'),
  processedAt: null,
  promotedToType: null,
  promotedToId: null,
  archivedAt: null,
  archiveReason: null,
  labelIds: ['label-a', 'label-b'],
  createdAt: new Date('2026-06-01T10:00:00.000Z'),
};

const INPUT_BASE = {
  captureId: 'cap-1',
  type: 'NOTE' as const,
  reference: new Date('2026-06-03T14:00:00.000Z'),
  timezone: 'America/Sao_Paulo',
};

describe('PromoteCaptureToNote', () => {
  let captureRepo: CaptureRepositoryFake;
  let noteRepo: NoteRepositoryFake;
  let createNote: CreateNote;
  let usecase: PromoteCaptureToNote;

  beforeEach(async () => {
    captureRepo = new CaptureRepositoryFake();
    noteRepo = new NoteRepositoryFake();
    createNote = new CreateNote(noteRepo);
    usecase = new PromoteCaptureToNote(captureRepo, createNote);
    await captureRepo.save({ ...BASE_CAPTURE });
  });

  it('cria Note com doc derivado do texto da captura; plainText bate com o texto', async () => {
    const { note } = await usecase.execute(INPUT_BASE);

    expect(note.userId).toBe('user-1');
    expect(note.type).toBe('NOTE');
    expect(docToText(note.doc)).toBe('pesquisar sobre Stoicismo');
    expect(note.plainText).toBe('pesquisar sobre Stoicismo');
  });

  it('marca a captura como PROCESSED com processedAt, promotedToType e promotedToId', async () => {
    const { note, capture } = await usecase.execute(INPUT_BASE);

    expect(capture.status).toBe('PROCESSED');
    expect(capture.processedAt).toBeInstanceOf(Date);
    expect(capture.promotedToType).toBe('note');
    expect(capture.promotedToId).toBe(note.id);
  });

  it('herda labelIds da captura para a nota', async () => {
    const { note } = await usecase.execute(INPUT_BASE);

    expect(note.labelIds).toEqual(['label-a', 'label-b']);
  });

  it('lança CaptureNotFoundError para captureId inexistente', async () => {
    await expect(
      usecase.execute({ ...INPUT_BASE, captureId: 'nao-existe' }),
    ).rejects.toThrow(CaptureNotFoundError);
  });

  it('lança CaptureAlreadyProcessedError para captura já PROCESSED', async () => {
    await captureRepo.update('cap-1', { status: 'PROCESSED' });

    await expect(usecase.execute(INPUT_BASE)).rejects.toThrow(
      CaptureAlreadyProcessedError,
    );
  });

  it('lança CaptureAlreadyProcessedError para captura já ARCHIVED', async () => {
    await captureRepo.update('cap-1', { status: 'ARCHIVED' });

    await expect(usecase.execute(INPUT_BASE)).rejects.toThrow(
      CaptureAlreadyProcessedError,
    );
  });
});
