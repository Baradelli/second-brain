import { beforeEach, describe, expect, it } from 'vitest';

import type { Note } from '../../domain/note.js';
import { NoteLinkRepositoryFake } from '../_fakes/note-link-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { BuildNoteGraph } from '../build-note-graph.js';

function makeNote(id: string, overrides?: Partial<Note>): Note {
  return {
    id,
    userId: 'user-1',
    type: 'NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    title: `Title ${id}`,
    doc: { type: 'doc', content: [] },
    plainText: '',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  };
}

describe('BuildNoteGraph', () => {
  let notes: NoteRepositoryFake;
  let links: NoteLinkRepositoryFake;
  let useCase: BuildNoteGraph;

  beforeEach(() => {
    notes = new NoteRepositoryFake();
    links = new NoteLinkRepositoryFake();
    useCase = new BuildNoteGraph(notes, links);
  });

  it('nodes are the user active notes (id, title, type)', async () => {
    await notes.save(makeNote('n1', { type: 'NOTE', title: 'First' }));
    await notes.save(makeNote('n2', { type: 'STUDY_NOTE', title: 'Second' }));

    const graph = await useCase.execute({ userId: 'user-1' });

    expect(graph.nodes.sort((a, b) => a.id.localeCompare(b.id))).toEqual([
      { id: 'n1', title: 'First', type: 'NOTE' },
      { id: 'n2', title: 'Second', type: 'STUDY_NOTE' },
    ]);
  });

  it('edges are note→note links between existing nodes', async () => {
    await notes.save(makeNote('n1'));
    await notes.save(makeNote('n2'));
    await links.replaceOutgoing('user-1', 'n1', ['n2']);

    const graph = await useCase.execute({ userId: 'user-1' });

    expect(graph.edges).toEqual([{ from: 'n1', to: 'n2' }]);
  });

  it('drops edges to nonexistent target notes (dangling)', async () => {
    await notes.save(makeNote('n1'));
    await links.replaceOutgoing('user-1', 'n1', ['ghost']);

    const graph = await useCase.execute({ userId: 'user-1' });

    expect(graph.edges).toEqual([]);
  });

  it('drops edges whose source note is archived (not a node)', async () => {
    await notes.save(makeNote('n1', { status: 'ARCHIVED' }));
    await notes.save(makeNote('n2'));
    await links.replaceOutgoing('user-1', 'n1', ['n2']);

    const graph = await useCase.execute({ userId: 'user-1' });

    expect(graph.nodes.map((n) => n.id)).toEqual(['n2']);
    expect(graph.edges).toEqual([]);
  });

  it('drops edges to archived target notes', async () => {
    await notes.save(makeNote('n1'));
    await notes.save(makeNote('n2', { status: 'ARCHIVED' }));
    await links.replaceOutgoing('user-1', 'n1', ['n2']);

    const graph = await useCase.execute({ userId: 'user-1' });

    expect(graph.nodes.map((n) => n.id)).toEqual(['n1']);
    expect(graph.edges).toEqual([]);
  });

  it('returns empty graph for a user with no notes', async () => {
    const graph = await useCase.execute({ userId: 'user-1' });
    expect(graph).toEqual({ nodes: [], edges: [] });
  });

  it('uses an empty string title when a note has none', async () => {
    await notes.save(makeNote('n1', { title: undefined }));

    const graph = await useCase.execute({ userId: 'user-1' });
    expect(graph.nodes[0]).toEqual({ id: 'n1', title: '', type: 'NOTE' });
  });
});
