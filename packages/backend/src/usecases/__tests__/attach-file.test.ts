import { describe, expect, it } from 'vitest';

import { AttachmentRepositoryFake } from '../_fakes/attachment-repository-fake.js';
import { NoteRepositoryFake } from '../_fakes/note-repository-fake.js';
import { AttachFile } from '../attach-file.js';

function makeNote(id = 'note-1', userId = 'user-1') {
  return {
    id,
    userId,
    type: 'NOTE' as const,
    scope: 'DAY' as const,
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: { type: 'doc', content: [] },
    plainText: '',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
  };
}

describe('AttachFile', () => {
  it('creates attachment linked to a note with url and type', async () => {
    const noteRepo = new NoteRepositoryFake();
    await noteRepo.save(makeNote());
    const attachRepo = new AttachmentRepositoryFake();
    const useCase = new AttachFile(attachRepo, noteRepo);

    const result = await useCase.execute({
      userId: 'user-1',
      noteId: 'note-1',
      url: 'https://cdn.example.com/file.jpg',
      type: 'image',
    });

    expect(result.id).toBeTruthy();
    expect(result.noteId).toBe('note-1');
    expect(result.userId).toBe('user-1');
    expect(result.url).toBe('https://cdn.example.com/file.jpg');
    expect(result.type).toBe('image');
    expect(attachRepo.saved).toHaveLength(1);
  });

  it('transcription and ocrStatus are null (OCR is MVP 5)', async () => {
    const noteRepo = new NoteRepositoryFake();
    await noteRepo.save(makeNote());
    const attachRepo = new AttachmentRepositoryFake();
    const useCase = new AttachFile(attachRepo, noteRepo);

    const result = await useCase.execute({
      userId: 'user-1',
      noteId: 'note-1',
      url: 'https://cdn.example.com/file.pdf',
      type: 'pdf',
    });

    expect(result.transcription).toBeNull();
    expect(result.ocrStatus).toBeNull();
  });

  it('stores optional metadata when provided', async () => {
    const noteRepo = new NoteRepositoryFake();
    await noteRepo.save(makeNote());
    const attachRepo = new AttachmentRepositoryFake();
    const useCase = new AttachFile(attachRepo, noteRepo);

    const result = await useCase.execute({
      userId: 'user-1',
      noteId: 'note-1',
      url: 'https://cdn.example.com/scan.jpg',
      type: 'image',
      mimeType: 'image/jpeg',
      name: 'scan.jpg',
      size: 204800,
    });

    expect(result.mimeType).toBe('image/jpeg');
    expect(result.name).toBe('scan.jpg');
    expect(result.size).toBe(204800);
  });

  it('throws when note does not exist', async () => {
    const noteRepo = new NoteRepositoryFake();
    const attachRepo = new AttachmentRepositoryFake();
    const useCase = new AttachFile(attachRepo, noteRepo);

    await expect(
      useCase.execute({
        userId: 'user-1',
        noteId: 'ghost-note',
        url: 'https://cdn.example.com/file.jpg',
        type: 'image',
      }),
    ).rejects.toThrow('Note not found');
  });

  it('throws when note belongs to a different user', async () => {
    const noteRepo = new NoteRepositoryFake();
    await noteRepo.save(makeNote('note-1', 'other-user'));
    const attachRepo = new AttachmentRepositoryFake();
    const useCase = new AttachFile(attachRepo, noteRepo);

    await expect(
      useCase.execute({
        userId: 'user-1',
        noteId: 'note-1',
        url: 'https://cdn.example.com/file.jpg',
        type: 'image',
      }),
    ).rejects.toThrow('Note not found');
  });

  it('listByNote returns all attachments for the note', async () => {
    const noteRepo = new NoteRepositoryFake();
    await noteRepo.save(makeNote('note-1'));
    await noteRepo.save(makeNote('note-2'));
    const attachRepo = new AttachmentRepositoryFake();
    const useCase = new AttachFile(attachRepo, noteRepo);

    await useCase.execute({
      userId: 'user-1',
      noteId: 'note-1',
      url: 'https://cdn.example.com/a.jpg',
      type: 'image',
    });
    await useCase.execute({
      userId: 'user-1',
      noteId: 'note-1',
      url: 'https://cdn.example.com/b.pdf',
      type: 'pdf',
    });
    await useCase.execute({
      userId: 'user-1',
      noteId: 'note-2',
      url: 'https://cdn.example.com/c.jpg',
      type: 'image',
    });

    const list = await attachRepo.listByNote('note-1');
    expect(list).toHaveLength(2);
    expect(list.every((a) => a.noteId === 'note-1')).toBe(true);
  });
});
