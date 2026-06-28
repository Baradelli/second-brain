import { beforeEach, describe, expect, it } from 'vitest';

import type { Note } from '../../domain/note.js';
import { NoteLinkRepositoryFake } from '../_fakes/note-link-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { ListBacklinks } from '../list-backlinks.js';

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

describe('ListBacklinks', () => {
  let notes: NoteRepositoryFake;
  let links: NoteLinkRepositoryFake;
  let useCase: ListBacklinks;

  beforeEach(() => {
    notes = new NoteRepositoryFake();
    links = new NoteLinkRepositoryFake();
    useCase = new ListBacklinks(notes, links);
  });

  it('returns the source notes (id + title) that link TO the target', async () => {
    await notes.save(makeNote('target'));
    await notes.save(makeNote('src-1', { title: 'Source One' }));
    await notes.save(makeNote('src-2', { title: 'Source Two' }));
    await links.replaceOutgoing('user-1', 'src-1', ['target']);
    await links.replaceOutgoing('user-1', 'src-2', ['target']);

    const result = await useCase.execute({
      userId: 'user-1',
      noteId: 'target',
    });

    expect(result.map((n) => n.id).sort()).toEqual(['src-1', 'src-2']);
    expect(result.find((n) => n.id === 'src-1')?.title).toBe('Source One');
  });

  it('returns [] when nothing links to the target', async () => {
    await notes.save(makeNote('lonely'));

    expect(
      await useCase.execute({ userId: 'user-1', noteId: 'lonely' }),
    ).toEqual([]);
  });

  it('excludes archived source notes', async () => {
    await notes.save(makeNote('target'));
    await notes.save(makeNote('active-src'));
    await notes.save(makeNote('archived-src', { status: 'ARCHIVED' }));
    await links.replaceOutgoing('user-1', 'active-src', ['target']);
    await links.replaceOutgoing('user-1', 'archived-src', ['target']);

    const result = await useCase.execute({
      userId: 'user-1',
      noteId: 'target',
    });

    expect(result.map((n) => n.id)).toEqual(['active-src']);
  });

  it('excludes dangling links whose source note no longer exists', async () => {
    await notes.save(makeNote('target'));
    await links.replaceOutgoing('user-1', 'ghost-src', ['target']);

    expect(
      await useCase.execute({ userId: 'user-1', noteId: 'target' }),
    ).toEqual([]);
  });

  it('excludes source notes belonging to another user', async () => {
    await notes.save(makeNote('target'));
    await notes.save(makeNote('other-src', { userId: 'user-2' }));
    // the link repo is scoped by userId; a cross-user link would not be returned
    // by listBacklinks('user-1', ...), but guard the join regardless.
    await links.replaceOutgoing('user-1', 'other-src', ['target']);

    const result = await useCase.execute({
      userId: 'user-1',
      noteId: 'target',
    });
    expect(result).toEqual([]);
  });
});
