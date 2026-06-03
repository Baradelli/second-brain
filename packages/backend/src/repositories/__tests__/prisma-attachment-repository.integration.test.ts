import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { Attachment } from '../../domain/attachment.js';
import type { Note } from '../../domain/note.js';
import { PrismaAttachmentRepository } from '../prisma-attachment-repository.js';
import { PrismaNoteRepository } from '../prisma-note-repository.js';
import { clearNotes, prisma, setupTestUser, TEST_USER_ID } from './_db.js';

const attachRepo = new PrismaAttachmentRepository(prisma);
const noteRepo = new PrismaNoteRepository(prisma);

function makeNote(id = 'att-note-1'): Note {
  return {
    id,
    userId: TEST_USER_ID,
    type: 'NOTE',
    scope: 'DAY',
    date: new Date('2026-06-02T00:00:00.000Z'),
    doc: { type: 'doc', content: [] },
    plainText: '',
    status: 'ACTIVE',
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
  };
}

function makeAttachment(overrides?: Partial<Attachment>): Attachment {
  return {
    id: randomUUID(),
    userId: TEST_USER_ID,
    url: 'https://cdn.example.com/file.jpg',
    type: 'image',
    mimeType: null,
    name: null,
    size: null,
    transcription: null,
    ocrStatus: null,
    noteId: 'att-note-1',
    captureId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

async function clearAttachments() {
  await prisma.attachment.deleteMany({ where: { userId: TEST_USER_ID } });
}

beforeAll(async () => {
  await setupTestUser();
  await noteRepo.save(makeNote('att-note-1'));
  await noteRepo.save(makeNote('att-note-2'));
});

beforeEach(async () => {
  await clearAttachments();
});

afterAll(async () => {
  await clearAttachments();
  await clearNotes();
  await prisma.$disconnect();
});

describe('PrismaAttachmentRepository', () => {
  it('save + listByNote round-trip preserves all fields', async () => {
    const attachment = makeAttachment({
      mimeType: 'image/jpeg',
      name: 'photo.jpg',
      size: 102400,
    });

    await attachRepo.save(attachment);
    const list = await attachRepo.listByNote('att-note-1');

    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(attachment.id);
    expect(list[0].userId).toBe(TEST_USER_ID);
    expect(list[0].url).toBe('https://cdn.example.com/file.jpg');
    expect(list[0].type).toBe('image');
    expect(list[0].mimeType).toBe('image/jpeg');
    expect(list[0].name).toBe('photo.jpg');
    expect(list[0].size).toBe(102400);
    expect(list[0].transcription).toBeNull();
    expect(list[0].ocrStatus).toBeNull();
  });

  it('transcription and ocrStatus are null after save', async () => {
    const attachment = makeAttachment();
    await attachRepo.save(attachment);

    const list = await attachRepo.listByNote('att-note-1');
    expect(list[0].transcription).toBeNull();
    expect(list[0].ocrStatus).toBeNull();
  });

  it('listByNote returns only attachments for that note', async () => {
    await attachRepo.save(makeAttachment({ noteId: 'att-note-1' }));
    await attachRepo.save(makeAttachment({ noteId: 'att-note-1' }));
    await attachRepo.save(makeAttachment({ noteId: 'att-note-2' }));

    const note1List = await attachRepo.listByNote('att-note-1');
    const note2List = await attachRepo.listByNote('att-note-2');

    expect(note1List).toHaveLength(2);
    expect(note2List).toHaveLength(1);
  });

  it('listByNote returns empty array when note has no attachments', async () => {
    const list = await attachRepo.listByNote('att-note-1');
    expect(list).toHaveLength(0);
  });
});
