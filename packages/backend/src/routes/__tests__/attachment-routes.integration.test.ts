import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'att-route-owner';
const OTHER_USER_ID = 'att-route-other';

let app: Awaited<ReturnType<typeof buildServer>>;

function injectAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: any,
) {
  return app.inject({
    ...opts,
    headers: {
      authorization: `Bearer ${app.jwt.sign({ sub: USER_ID })}`,
      ...opts.headers,
    },
  });
}

async function clearData() {
  await prisma.attachment.deleteMany({
    where: { userId: { in: [USER_ID, OTHER_USER_ID] } },
  });
  await prisma.note.deleteMany({
    where: { userId: { in: [USER_ID, OTHER_USER_ID] } },
  });
}

async function createNote(userId = USER_ID) {
  const res = await injectAuth({
    method: 'POST',
    url: '/notes',
    payload: {
      type: 'NOTE',
      date: '2026-06-02T00:00:00.000Z',
      doc: { type: 'doc', content: [] },
    },
    // a nota nasce do dono do token
    headers: { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` },
  });
  expect(res.statusCode).toBe(201);
  return res.json() as { id: string };
}

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: {
      id: USER_ID,
      email: 'att-route-owner@cerebro.local',
      name: 'Att Route Owner',
    },
  });
  await prisma.user.upsert({
    where: { id: OTHER_USER_ID },
    update: {},
    create: {
      id: OTHER_USER_ID,
      email: 'att-route-other@cerebro.local',
      name: 'Att Route Other',
    },
  });
});

beforeEach(async () => {
  await clearData();
});

afterAll(async () => {
  await clearData();
  await prisma.user.deleteMany({
    where: { id: { in: [USER_ID, OTHER_USER_ID] } },
  });
  await prisma.$disconnect();
  await app.close();
});

describe('POST /notes/:id/attachments', () => {
  it('creates an attachment and returns 201 with null transcription/ocrStatus', async () => {
    const note = await createNote();

    const res = await injectAuth({
      method: 'POST',
      url: `/notes/${note.id}/attachments`,
      payload: {
        userId: USER_ID,
        url: 'https://cdn.example.com/file.jpg',
        type: 'image',
        mimeType: 'image/jpeg',
        name: 'file.jpg',
        size: 51200,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.noteId).toBe(note.id);
    expect(body.userId).toBe(USER_ID);
    expect(body.url).toBe('https://cdn.example.com/file.jpg');
    expect(body.type).toBe('image');
    expect(body.mimeType).toBe('image/jpeg');
    expect(body.name).toBe('file.jpg');
    expect(body.size).toBe(51200);
    expect(body.transcription).toBeNull();
    expect(body.ocrStatus).toBeNull();
  });

  it('returns 400 when url is invalid', async () => {
    const note = await createNote();

    const res = await injectAuth({
      method: 'POST',
      url: `/notes/${note.id}/attachments`,
      payload: {
        userId: USER_ID,
        url: 'not-a-url',
        type: 'image',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when type is invalid', async () => {
    const note = await createNote();

    const res = await injectAuth({
      method: 'POST',
      url: `/notes/${note.id}/attachments`,
      payload: {
        userId: USER_ID,
        url: 'https://cdn.example.com/file.jpg',
        type: 'unsupported',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns error when note does not exist', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: `/notes/ghost-note-id/attachments`,
      payload: {
        userId: USER_ID,
        url: 'https://cdn.example.com/file.jpg',
        type: 'image',
      },
    });

    expect(res.statusCode).toBe(500);
  });

  it('returns error when note belongs to another user', async () => {
    const note = await createNote(OTHER_USER_ID);

    const res = await injectAuth({
      method: 'POST',
      url: `/notes/${note.id}/attachments`,
      payload: {
        userId: USER_ID,
        url: 'https://cdn.example.com/file.jpg',
        type: 'image',
      },
    });

    expect(res.statusCode).toBe(500);
  });
});

describe('GET /notes/:id/attachments', () => {
  it('returns all attachments for a note in order', async () => {
    const note = await createNote();

    await injectAuth({
      method: 'POST',
      url: `/notes/${note.id}/attachments`,
      payload: {
        userId: USER_ID,
        url: 'https://cdn.example.com/a.jpg',
        type: 'image',
      },
    });
    await injectAuth({
      method: 'POST',
      url: `/notes/${note.id}/attachments`,
      payload: {
        userId: USER_ID,
        url: 'https://cdn.example.com/b.pdf',
        type: 'pdf',
      },
    });

    const res = await injectAuth({
      method: 'GET',
      url: `/notes/${note.id}/attachments`,
    });

    expect(res.statusCode).toBe(200);
    const list = res.json();
    expect(list).toHaveLength(2);
    expect(list.every((a: { noteId: string }) => a.noteId === note.id)).toBe(
      true,
    );
  });

  it('returns empty array when note has no attachments', async () => {
    const note = await createNote();

    const res = await injectAuth({
      method: 'GET',
      url: `/notes/${note.id}/attachments`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});
