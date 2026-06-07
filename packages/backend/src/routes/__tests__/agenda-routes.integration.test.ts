import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner';

async function clearData() {
  await prisma.note.deleteMany({ where: { userId: USER_ID } });
  await prisma.capture.deleteMany({ where: { userId: USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: USER_ID } });
  await prisma.resource.deleteMany({ where: { userId: USER_ID } });
}

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

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await clearData();
});

afterAll(async () => {
  await clearData();
  await prisma.$disconnect();
  await app.close();
});

describe('GET /agenda', () => {
  it('retorna 200 com journal e capturesToReview', async () => {
    const res = await injectAuth({
      method: 'GET',
      url: `/agenda?userId=${USER_ID}&day=today`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(body.goals)).toBe(true);
    expect(body.journal.devotional).toEqual({ done: false });
    expect(body.journal.reflection).toEqual({ done: false });
    expect(body.capturesToReview).toEqual([]);
  });
});

describe('POST /captures/:id/archive', () => {
  it('arquiva captura → 200, some da fila PENDING', async () => {
    const createRes = await injectAuth({
      method: 'POST',
      url: '/captures',
      payload: { userId: USER_ID, text: 'captura para arquivar' },
    });
    const { id } = createRes.json<{ id: string }>();

    const archiveRes = await injectAuth({
      method: 'POST',
      url: `/captures/${id}/archive`,
      payload: { reason: 'já não faz sentido' },
    });

    expect(archiveRes.statusCode).toBe(200);
    const archived = archiveRes.json();
    expect(archived.status).toBe('ARCHIVED');
    expect(archived.archiveReason).toBe('já não faz sentido');

    const listRes = await injectAuth({
      method: 'GET',
      url: `/captures?userId=${USER_ID}&status=PENDING`,
    });
    expect(listRes.json()).toHaveLength(0);
  });
});

describe('POST /captures/:id/promote', () => {
  it('promove captura para Note → 201 com note e capture PROCESSED', async () => {
    const createRes = await injectAuth({
      method: 'POST',
      url: '/captures',
      payload: { userId: USER_ID, text: 'estudar Stoicismo' },
    });
    const { id } = createRes.json<{ id: string }>();

    const promoteRes = await injectAuth({
      method: 'POST',
      url: `/captures/${id}/promote`,
      payload: { destination: 'note', type: 'NOTE' },
    });

    expect(promoteRes.statusCode).toBe(201);
    const body = promoteRes.json();
    expect(body.note.plainText).toBe('estudar Stoicismo');
    expect(body.capture.status).toBe('PROCESSED');
    expect(body.capture.promotedToId).toBe(body.note.id);
  });

  it('type inválido → 400 (Zod)', async () => {
    const createRes = await injectAuth({
      method: 'POST',
      url: '/captures',
      payload: { userId: USER_ID, text: 'captura' },
    });
    const { id } = createRes.json<{ id: string }>();

    const res = await injectAuth({
      method: 'POST',
      url: `/captures/${id}/promote`,
      payload: { destination: 'note', type: 'INVALIDO' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('promove captura para Resource → 201', async () => {
    const createRes = await injectAuth({
      method: 'POST',
      url: '/captures',
      payload: { userId: USER_ID, text: 'Domain-Driven Design' },
    });
    const { id } = createRes.json<{ id: string }>();

    const res = await injectAuth({
      method: 'POST',
      url: `/captures/${id}/promote`,
      payload: { destination: 'resource', type: 'book' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.resource.title).toBe('Domain-Driven Design');
    expect(body.resource.stage).toBe('backlog');
    expect(body.capture.promotedToType).toBe('resource');
  });

  it('promove captura para Goal → 201', async () => {
    const createRes = await injectAuth({
      method: 'POST',
      url: '/captures',
      payload: { userId: USER_ID, text: 'Ler todo dia' },
    });
    const { id } = createRes.json<{ id: string }>();

    const res = await injectAuth({
      method: 'POST',
      url: `/captures/${id}/promote`,
      payload: { destination: 'goal', type: 'HABIT', weekdays: [1, 3, 5] },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.goal.title).toBe('Ler todo dia');
    expect(body.goal.type).toBe('HABIT');
    expect(body.capture.promotedToType).toBe('goal');
  });
});
