import { describe, expect, it } from 'vitest';

import {
  CaptureNotFoundError,
  GuideQuestionNotFoundError,
  LabelNotFoundError,
  NoteNotFoundError,
} from '../../domain/errors.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { GuideQuestionRepositoryFake } from '../_fakes/guide-question-repository-fake.js';
import { LabelRepositoryFake } from '../_fakes/label-repository-fake.js';
import { NoteLinkRepositoryFake } from '../_fakes/note-link-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { ArchiveCapture } from '../archive-capture.js';
import { ArchiveLabel } from '../archive-label.js';
import { ArchiveNote } from '../archive-note.js';
import { EditNote } from '../edit-note.js';
import { loadPendingCapture } from '../promote-capture-shared.js';
import { ToggleGuideQuestion } from '../toggle-guide-question.js';

// Tarefa 77 — ownership: dono errado responde NotFound (não vaza a existência
// do recurso). Cobre os usecases que buscavam por id sem checar o dono.

const OWNER = 'owner-1';
const INTRUDER = 'intruder-9';

function makeCapture(id: string) {
  return {
    id,
    userId: OWNER,
    text: 'segredo do dono',
    url: undefined,
    status: 'PENDING' as const,
    reviewAt: null,
    processedAt: null,
    promotedToType: null,
    promotedToId: null,
    archivedAt: null,
    archiveReason: null,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
  };
}

function makeNote(id: string) {
  return {
    id,
    userId: OWNER,
    type: 'NOTE' as const,
    scope: 'DAY' as const,
    date: new Date('2026-06-01T03:00:00.000Z'),
    doc: { type: 'doc', content: [] },
    plainText: '',
    status: 'ACTIVE' as const,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
  };
}

describe('ownership — intruso recebe NotFound (Tarefa 77)', () => {
  it('ArchiveCapture: captura de outro dono', async () => {
    const repo = new CaptureRepositoryFake();
    await repo.save(makeCapture('cap-1'));

    await expect(
      new ArchiveCapture(repo).execute({ id: 'cap-1', userId: INTRUDER }),
    ).rejects.toThrow(CaptureNotFoundError);
  });

  it('loadPendingCapture (promotes): captura de outro dono', async () => {
    const repo = new CaptureRepositoryFake();
    await repo.save(makeCapture('cap-1'));

    await expect(
      loadPendingCapture(repo, 'cap-1', INTRUDER),
    ).rejects.toThrow(CaptureNotFoundError);
  });

  it('ArchiveNote: nota de outro dono', async () => {
    const repo = new NoteRepositoryFake();
    await repo.save(makeNote('n-1'));

    await expect(
      new ArchiveNote(repo).execute({ id: 'n-1', userId: INTRUDER }),
    ).rejects.toThrow(NoteNotFoundError);
  });

  it('EditNote: nota de outro dono', async () => {
    const repo = new NoteRepositoryFake();
    await repo.save(makeNote('n-1'));

    await expect(
      new EditNote(repo, new NoteLinkRepositoryFake()).execute({
        id: 'n-1',
        userId: INTRUDER,
        title: 'hackeado',
      }),
    ).rejects.toThrow(NoteNotFoundError);
  });

  it('ArchiveLabel: label de outro dono', async () => {
    const repo = new LabelRepositoryFake();
    await repo.save({
      id: 'l-1',
      userId: OWNER,
      name: 'Privado',
      parentId: null,
      color: null,
      status: 'ACTIVE',
      archivedAt: null,
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
    });

    await expect(
      new ArchiveLabel(repo).execute({ id: 'l-1', userId: INTRUDER }),
    ).rejects.toThrow(LabelNotFoundError);
  });

  it('ToggleGuideQuestion: pergunta de label de outro dono', async () => {
    const repo = new GuideQuestionRepositoryFake();
    repo.addLabel({ id: 'book', userId: OWNER, name: 'Book' });
    await repo.save({
      id: 'q-1',
      labelId: 'book',
      text: 'Foi uma leitura fácil?',
      order: 0,
      active: true,
    });

    await expect(
      new ToggleGuideQuestion(repo).execute({
        id: 'q-1',
        userId: INTRUDER,
        active: false,
      }),
    ).rejects.toThrow(GuideQuestionNotFoundError);
  });
});
