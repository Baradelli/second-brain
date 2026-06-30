import { beforeEach, describe, expect, it } from 'vitest';

import {
  ResourceHasReferencesError,
  ResourceNotArchivedError,
  ResourceNotFoundError,
} from '../../domain/errors.js';
import type { Note } from '../../domain/note.js';
import type { Resource } from '../../domain/resource.js';
import type { StudyItem } from '../../domain/study-item.js';
import { HighlightRepositoryFake } from '../_fakes/highlight-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { ResourceRepositoryFake } from '../_fakes/resource-repository-fake.js';
import { StudyItemRepositoryFake } from '../_fakes/study-item-repository-fake.js';
import { DeleteResource } from '../delete-resource.js';

const USER = 'user-1';

function makeResource(overrides?: Partial<Resource>): Resource {
  return {
    id: 'r1',
    userId: USER,
    title: 'Livro',
    type: 'book',
    url: null,
    author: null,
    description: null,
    stage: 'backlog',
    status: 'ARCHIVED',
    archivedAt: new Date('2026-06-03T00:00:00.000Z'),
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

function makeNote(resourceId: string): Note {
  return {
    id: 'n1',
    userId: USER,
    type: 'STUDY_NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: { type: 'doc', content: [] },
    plainText: '',
    resourceId,
    status: 'ACTIVE',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
  };
}

function makeStudyItem(resourceId: string): StudyItem {
  return {
    id: 's1',
    userId: USER,
    resourceId,
    title: 'Item',
    reference: null,
    questions: null,
    fichamentoNoteId: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    labelIds: [],
  };
}

describe('DeleteResource', () => {
  let resources: ResourceRepositoryFake;
  let notes: NoteRepositoryFake;
  let studyItems: StudyItemRepositoryFake;
  let highlights: HighlightRepositoryFake;
  let useCase: DeleteResource;

  beforeEach(() => {
    resources = new ResourceRepositoryFake();
    notes = new NoteRepositoryFake();
    studyItems = new StudyItemRepositoryFake();
    highlights = new HighlightRepositoryFake();
    useCase = new DeleteResource(resources, notes, studyItems, highlights);
  });

  it('apaga um recurso arquivado sem referências', async () => {
    await resources.save(makeResource());

    const result = await useCase.execute({ id: 'r1', userId: USER });

    expect(result.id).toBe('r1');
    expect(await resources.byId('r1')).toBeNull();
  });

  it('recusa se o recurso não está arquivado', async () => {
    await resources.save(makeResource({ status: 'ACTIVE', archivedAt: null }));

    await expect(useCase.execute({ id: 'r1', userId: USER })).rejects.toThrow(
      ResourceNotArchivedError,
    );
  });

  it('recusa se há notas apontando para o recurso', async () => {
    await resources.save(makeResource());
    await notes.save(makeNote('r1'));

    await expect(useCase.execute({ id: 'r1', userId: USER })).rejects.toThrow(
      ResourceHasReferencesError,
    );
  });

  it('recusa se há itens de estudo apontando para o recurso', async () => {
    await resources.save(makeResource());
    await studyItems.save(makeStudyItem('r1'));

    await expect(useCase.execute({ id: 'r1', userId: USER })).rejects.toThrow(
      ResourceHasReferencesError,
    );
  });

  it('recusa se há grifos apontando para o recurso', async () => {
    await resources.save(makeResource());
    await highlights.save({
      id: 'h1',
      userId: USER,
      resourceId: 'r1',
      colorId: 'hl-yellow',
      location: null,
      quote: 'q',
      comment: null,
      status: 'ACTIVE',
      archivedAt: null,
      createdAt: new Date('2026-06-02T10:00:00.000Z'),
    });

    await expect(useCase.execute({ id: 'r1', userId: USER })).rejects.toThrow(
      ResourceHasReferencesError,
    );
  });

  it('não apaga recurso de outro usuário', async () => {
    await resources.save(makeResource({ userId: 'other' }));

    await expect(useCase.execute({ id: 'r1', userId: USER })).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
