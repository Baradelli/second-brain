import { beforeEach, describe, expect, it } from 'vitest';

import type { Capture } from '../../domain/capture.js';
import type { Note } from '../../domain/note.js';
import type { Resource } from '../../domain/resource.js';
import { CaptureRepositoryFake } from '../_fakes/capture-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { ResourceRepositoryFake } from '../_fakes/resource-repository-fake.js';
import { SearchAll } from '../search-all.js';

const USER = 'user-1';

function makeNote(overrides: Partial<Note> & { id: string }): Note {
  return {
    id: overrides.id,
    userId: USER,
    type: 'NOTE',
    scope: 'DAY',
    date: new Date('2026-06-03T00:00:00.000Z'),
    title: undefined,
    doc: {},
    plainText: '',
    labelIds: [],
    status: 'ACTIVE',
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    ...overrides,
  };
}

function makeResource(overrides: Partial<Resource> & { id: string }): Resource {
  return {
    id: overrides.id,
    userId: USER,
    title: '',
    type: 'book',
    url: null,
    author: null,
    description: null,
    stage: 'backlog',
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    labelIds: [],
    ...overrides,
  };
}

function makeCapture(overrides: Partial<Capture> & { id: string }): Capture {
  return {
    id: overrides.id,
    userId: USER,
    text: '',
    status: 'PENDING',
    reviewAt: null,
    processedAt: null,
    promotedToType: null,
    promotedToId: null,
    archivedAt: null,
    archiveReason: null,
    labelIds: [],
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    ...overrides,
  };
}

describe('SearchAll', () => {
  let notes: NoteRepositoryFake;
  let resources: ResourceRepositoryFake;
  let captures: CaptureRepositoryFake;
  let useCase: SearchAll;

  beforeEach(() => {
    notes = new NoteRepositoryFake();
    resources = new ResourceRepositoryFake();
    captures = new CaptureRepositoryFake();
    useCase = new SearchAll(notes, resources, captures);
  });

  it('matches notes by title and plainText (case-insensitive)', async () => {
    await notes.save(makeNote({ id: 'n1', title: 'Sobre Clareza' }));
    await notes.save(makeNote({ id: 'n2', plainText: 'um texto com clareza no meio' }));
    await notes.save(makeNote({ id: 'n3', title: 'outra coisa' }));

    const r = await useCase.execute({ userId: USER, query: 'clareza' });
    expect(r.notes.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
  });

  it('matches resources by title, author and description', async () => {
    await resources.save(makeResource({ id: 'r1', title: 'Clean Code' }));
    await resources.save(makeResource({ id: 'r2', author: 'Robert Martin' }));
    await resources.save(
      makeResource({ id: 'r3', description: 'sobre código limpo' }),
    );
    await resources.save(makeResource({ id: 'r4', title: 'nada a ver' }));

    const r = await useCase.execute({ userId: USER, query: 'código' });
    expect(r.resources.map((x) => x.id)).toEqual(['r3']);
    const r2 = await useCase.execute({ userId: USER, query: 'martin' });
    expect(r2.resources.map((x) => x.id)).toEqual(['r2']);
  });

  it('matches captures by text', async () => {
    await captures.save(makeCapture({ id: 'c1', text: 'ideia genial' }));
    await captures.save(makeCapture({ id: 'c2', text: 'outra nota' }));

    const r = await useCase.execute({ userId: USER, query: 'genial' });
    expect(r.captures.map((c) => c.id)).toEqual(['c1']);
  });

  it('ignores archived/processed items and other users', async () => {
    await notes.save(
      makeNote({ id: 'n-arch', title: 'clareza', status: 'ARCHIVED' }),
    );
    await resources.save(
      makeResource({ id: 'r-arch', title: 'clareza', status: 'ARCHIVED' }),
    );
    await captures.save(
      makeCapture({ id: 'c-proc', text: 'clareza', status: 'PROCESSED' }),
    );
    await notes.save(
      makeNote({ id: 'n-other', title: 'clareza', userId: 'other' }),
    );

    const r = await useCase.execute({ userId: USER, query: 'clareza' });
    expect(r.notes).toHaveLength(0);
    expect(r.resources).toHaveLength(0);
    expect(r.captures).toHaveLength(0);
  });

  it('returns empty groups for a blank query', async () => {
    await notes.save(makeNote({ id: 'n1', title: 'qualquer' }));
    const r = await useCase.execute({ userId: USER, query: '   ' });
    expect(r).toEqual({ notes: [], resources: [], captures: [] });
  });
});
