import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner'; // seeded user

async function clearAll() {
  await prisma.recall.deleteMany({ where: { userId: USER_ID } });
  await prisma.studyItem.deleteMany({ where: { userId: USER_ID } });
}

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

const baseBody = { title: 'Cap. 3 — A ressurreição em Paulo' };

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await clearAll();
});

afterAll(async () => {
  await clearAll();
  await prisma.$disconnect();
  await app.close();
});

describe('POST /study-items', () => {
  it('creates a study item → 201 with ACTIVE status and a schedule', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/study-items',
      payload: baseBody,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.status).toBe('ACTIVE');
    expect(body.userId).toBe(USER_ID);
    // zero recalls → next review in 2 days, not consolidated
    expect(body.schedule.index).toBe(0);
    expect(body.schedule.consolidated).toBe(false);
    expect(body.schedule.nextRecallAt).not.toBeNull();
  });

  it('rejects empty title → 400', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/study-items',
      payload: { title: '   ' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /study-items/:id/recalls', () => {
  it('logs a recall → 201 and the item schedule advances to index 1', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/study-items',
      payload: baseBody,
    });
    const id = created.json().id;

    const recall = await injectAuth({
      method: 'POST',
      url: `/study-items/${id}/recalls`,
      payload: { confidence: 'B' },
    });
    expect(recall.statusCode).toBe(201);
    expect(recall.json().confidence).toBe('B');

    const reloaded = await injectAuth({
      method: 'GET',
      url: `/study-items/${id}`,
    });
    expect(reloaded.json().schedule.index).toBe(1);
  });

  it('rejects an invalid confidence → 400', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/study-items',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'POST',
      url: `/study-items/${id}/recalls`,
      payload: { confidence: 'D' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /study-items/:id/archive', () => {
  it('archives the item → 200 status ARCHIVED', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/study-items',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'POST',
      url: `/study-items/${id}/archive`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ARCHIVED');
  });
});

describe('ownership', () => {
  it('GET another user item → 404 (no leak)', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/study-items',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'GET',
      url: `/study-items/${id}`,
      headers: { authorization: `Bearer ${app.jwt.sign({ sub: 'intruder' })}` },
    });
    expect(res.statusCode).toBe(404);
  });
});
