import { beforeEach, describe, expect, it } from 'vitest';

import type { Attachment } from '../../domain/attachment.js';
import {
  NoteHasReferencesError,
  NoteNotArchivedError,
  NoteNotFoundError,
} from '../../domain/errors.js';
import type { Note } from '../../domain/note.js';
import type { Publication } from '../../domain/publication.js';
import type { StudyItem } from '../../domain/study-item.js';
import { AttachmentRepositoryFake } from '../_fakes/attachment-repository-fake.js';
import { NoteLinkRepositoryFake } from '../_fakes/note-link-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { PublicationRepositoryFake } from '../_fakes/publication-repository-fake.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { DeleteNote } from '../delete-note.js';

const USER = 'user-1';

function makeNote(overrides?: Partial<Note>): Note {
  return {
    id: 'n1',
    userId: USER,
    type: 'NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: { type: 'doc', content: [] },
    plainText: '',
    status: 'ARCHIVED',
    archivedAt: new Date('2026-06-03T00:00:00.000Z'),
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

function makeAttachment(noteId: string): Attachment {
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
    noteId,
    captureId: null,
    createdAt: new Date('2026-06-02T11:00:00.000Z'),
  };
}

function makeStudyItem(fichamentoNoteId: string): StudyItem {
  return {
    id: 's1',
    userId: USER,
    resourceId: null,
    title: 'Item',
    reference: null,
    questions: null,
    fichamentoNoteId,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-02T11:00:00.000Z'),
    labelIds: [],
  };
}

function makePublication(noteId: string): Publication {
  return {
    id: 'p1',
    userId: USER,
    sourceType: 'note',
    sourceId: 'src',
    format: 'blog',
    stage: 'draft',
    title: 'Pub',
    noteId,
    publishedAt: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-02T11:00:00.000Z'),
    labelIds: [],
  };
}

describe('DeleteNote', () => {
  let notes: NoteRepositoryFake;
  let links: NoteLinkRepositoryFake;
  let attachments: AttachmentRepositoryFake;
  let studyItems: StudyItemRepositoryFake;
  let publications: PublicationRepositoryFake;
  let useCase: DeleteNote;

  beforeEach(() => {
    notes = new NoteRepositoryFake();
    links = new NoteLinkRepositoryFake();
    attachments = new AttachmentRepositoryFake();
    studyItems = new StudyItemRepositoryFake();
    publications = new PublicationRepositoryFake();
    useCase = new DeleteNote(
      notes,
      links,
      attachments,
      studyItems,
      publications,
    );
  });

  it('apaga uma nota arquivada sem referências e limpa seus links de saída', async () => {
    await notes.save(makeNote());
    await links.replaceOutgoing(USER, 'n1', ['other']); // links de saída

    const result = await useCase.execute({ id: 'n1', userId: USER });

    expect(result.id).toBe('n1');
    expect(await notes.byId('n1')).toBeNull();
    expect(await links.listGraphEdges(USER)).toHaveLength(0);
  });

  it('recusa se a nota não está arquivada', async () => {
    await notes.save(makeNote({ status: 'ACTIVE', archivedAt: undefined }));

    await expect(useCase.execute({ id: 'n1', userId: USER })).rejects.toThrow(
      NoteNotArchivedError,
    );
    expect(await notes.byId('n1')).not.toBeNull();
  });

  it('recusa se outras notas a mencionam (backlinks)', async () => {
    await notes.save(makeNote());
    await links.replaceOutgoing(USER, 'origem', ['n1']); // origem → n1

    await expect(useCase.execute({ id: 'n1', userId: USER })).rejects.toThrow(
      NoteHasReferencesError,
    );
    expect(await notes.byId('n1')).not.toBeNull();
  });

  it('recusa se há anexos', async () => {
    await notes.save(makeNote());
    await attachments.save(makeAttachment('n1'));

    await expect(useCase.execute({ id: 'n1', userId: USER })).rejects.toThrow(
      NoteHasReferencesError,
    );
  });

  it('recusa se é o fichamento de um study item', async () => {
    await notes.save(makeNote());
    await studyItems.save(makeStudyItem('n1'));

    await expect(useCase.execute({ id: 'n1', userId: USER })).rejects.toThrow(
      NoteHasReferencesError,
    );
  });

  it('recusa se é o rascunho de uma publicação', async () => {
    await notes.save(makeNote());
    await publications.save(makePublication('n1'));

    await expect(useCase.execute({ id: 'n1', userId: USER })).rejects.toThrow(
      NoteHasReferencesError,
    );
  });

  it('não apaga nota de outro usuário', async () => {
    await notes.save(makeNote({ userId: 'other' }));

    await expect(useCase.execute({ id: 'n1', userId: USER })).rejects.toThrow(
      NoteNotFoundError,
    );
  });
});
