import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner';

async function clearNotes() {
  await prisma.note.deleteMany({ where: { userId: USER_ID } });
}

const baseBody = {
  userId: USER_ID,
  type: 'NOTE',
  date: '2026-06-02T00:00:00.000Z',
  doc: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
    ],
  },
};

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await clearNotes();
});

afterAll(async () => {
  await clearNotes();
  await prisma.$disconnect();
  await app.close();
});

describe('POST /notes', () => {
  it('creates a note and returns 201 with id, plainText, status ACTIVE', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: baseBody,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.plainText).toBe('hello');
    expect(body.status).toBe('ACTIVE');
    expect(body.type).toBe('NOTE');
    expect(body.userId).toBe(USER_ID);
  });

  it('returns 400 when type is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...baseBody, type: 'INVALID_TYPE' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { userId: USER_ID },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /notes', () => {
  it('returns only notes matching type filter', async () => {
    await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...baseBody, type: 'NOTE' },
    });
    await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...baseBody, type: 'DEVOTIONAL' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/notes?userId=${USER_ID}&type=DEVOTIONAL`,
    });

    expect(res.statusCode).toBe(200);
    const notes = res.json();
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('DEVOTIONAL');
  });

  it('respects from/to date range filter', async () => {
    await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...baseBody, date: '2026-06-01T00:00:00.000Z' },
    });
    await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...baseBody, date: '2026-06-03T00:00:00.000Z' },
    });
    await app.inject({
      method: 'POST',
      url: '/notes',
      payload: { ...baseBody, date: '2026-06-05T00:00:00.000Z' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/notes?userId=${USER_ID}&from=2026-06-02T00:00:00.000Z&to=2026-06-04T00:00:00.000Z`,
    });

    expect(res.statusCode).toBe(200);
    const notes = res.json();
    expect(notes).toHaveLength(1);
    expect(notes[0].date).toBe('2026-06-03T00:00:00.000Z');
  });

  it('POST /notes/:id/archive arquiva e some da lista ACTIVE', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/notes',
      payload: baseBody,
    });
    const id = created.json().id;

    const archived = await app.inject({
      method: 'POST',
      url: `/notes/${id}/archive`,
      payload: {},
    });
    expect(archived.statusCode).toBe(200);
    expect(archived.json().status).toBe('ARCHIVED');

    const active = await app.inject({
      method: 'GET',
      url: `/notes?userId=${USER_ID}&status=ACTIVE`,
    });
    expect(active.json().map((n: { id: string }) => n.id)).not.toContain(id);
  });

  it('POST /notes/:id/archive de id inexistente → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notes/ghost/archive',
      payload: {},
    });
    expect(res.statusCode).toBe(404);
  });
});
