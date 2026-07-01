import { beforeEach, describe, expect, it } from 'vitest';

import type { Note } from '../../domain/note.js';
import type { Publication } from '../../domain/publication.js';
import type { StudyItem } from '../../domain/study-item.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { PublicationRepositoryFake } from '../_fakes/publication-repository-fake.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { ListResourcePublications } from '../list-resource-publications.js';

const USER = 'user-1';
const RES = 'res-1';

function makePublication(overrides: Partial<Publication> & { id: string }): Publication {
  return {
    userId: USER,
    sourceType: 'resource',
    sourceId: RES,
    format: 'linkedin',
    stage: 'idea',
    title: 'Post',
    noteId: null,
    publishedAt: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-10T00:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> & { id: string }): Note {
  return {
    userId: USER,
    type: 'STUDY_NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: { type: 'doc', content: [] },
    plainText: '',
    resourceId: RES,
    status: 'ACTIVE',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

function makeStudyItem(overrides: Partial<StudyItem> & { id: string }): StudyItem {
  return {
    userId: USER,
    resourceId: RES,
    title: 'Item',
    reference: null,
    questions: null,
    fichamentoNoteId: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

describe('ListResourcePublications', () => {
  let publications: PublicationRepositoryFake;
  let studyItems: StudyItemRepositoryFake;
  let notes: NoteRepositoryFake;
  let useCase: ListResourcePublications;

  beforeEach(() => {
    publications = new PublicationRepositoryFake();
    studyItems = new StudyItemRepositoryFake();
    notes = new NoteRepositoryFake();
    useCase = new ListResourcePublications(publications, studyItems, notes);
  });

  it('includes publications made directly from the resource', async () => {
    await publications.save(
      makePublication({ id: 'p-res', sourceType: 'resource', sourceId: RES }),
    );

    const result = await useCase.execute({ userId: USER, resourceId: RES });
    expect(result.map((p) => p.id)).toEqual(['p-res']);
  });

  it('includes publications made from study items of the resource', async () => {
    await studyItems.save(makeStudyItem({ id: 's-1' }));
    await publications.save(
      makePublication({
        id: 'p-study',
        sourceType: 'study_item',
        sourceId: 's-1',
      }),
    );

    const result = await useCase.execute({ userId: USER, resourceId: RES });
    expect(result.map((p) => p.id)).toEqual(['p-study']);
  });

  it('includes publications made from notes of the resource', async () => {
    await notes.save(makeNote({ id: 'n-1' }));
    await publications.save(
      makePublication({ id: 'p-note', sourceType: 'note', sourceId: 'n-1' }),
    );

    const result = await useCase.execute({ userId: USER, resourceId: RES });
    expect(result.map((p) => p.id)).toEqual(['p-note']);
  });

  it('excludes publications whose source belongs to another resource', async () => {
    await studyItems.save(
      makeStudyItem({ id: 's-other', resourceId: 'res-2' }),
    );
    await publications.save(
      makePublication({
        id: 'p-other',
        sourceType: 'study_item',
        sourceId: 's-other',
      }),
    );
    // Uma publicação direta de outro recurso também é excluída.
    await publications.save(
      makePublication({
        id: 'p-res2',
        sourceType: 'resource',
        sourceId: 'res-2',
      }),
    );

    const result = await useCase.execute({ userId: USER, resourceId: RES });
    expect(result).toHaveLength(0);
  });

  it('excludes recap-sourced and archived publications', async () => {
    await publications.save(
      makePublication({ id: 'p-recap', sourceType: 'recap', sourceId: RES }),
    );
    await publications.save(
      makePublication({ id: 'p-archived', status: 'ARCHIVED' }),
    );

    const result = await useCase.execute({ userId: USER, resourceId: RES });
    expect(result).toHaveLength(0);
  });

  it('does not leak another user\'s publications', async () => {
    await publications.save(
      makePublication({ id: 'p-mine' }),
    );
    await publications.save(
      makePublication({ id: 'p-theirs', userId: 'other' }),
    );

    const result = await useCase.execute({ userId: USER, resourceId: RES });
    expect(result.map((p) => p.id)).toEqual(['p-mine']);
  });
});
