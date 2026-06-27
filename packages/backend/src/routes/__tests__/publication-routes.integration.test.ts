import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner'; // seeded user

async function clearPublications() {
  await prisma.publication.deleteMany({ where: { userId: USER_ID } });
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

const baseBody = {
  userId: USER_ID,
  sourceType: 'study_item',
  sourceId: 'si-1',
  format: 'blog',
  title: 'A ressurreição em Paulo',
};

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await clearPublications();
});

afterAll(async () => {
  await clearPublications();
  await prisma.$disconnect();
  await app.close();
});

describe('POST /publications', () => {
  it('cria publicação válida → 201, stage=idea, status=ACTIVE, publishedAt=null', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/publications',
      payload: baseBody,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.stage).toBe('idea');
    expect(body.status).toBe('ACTIVE');
    expect(body.publishedAt).toBeNull();
    expect(body.userId).toBe(USER_ID);
  });

  it('rejeita body inválido (format fora do enum) → 400', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/publications',
      payload: { ...baseBody, format: 'tiktok' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH /publications/:id', () => {
  it('avançar stage para published seta publishedAt', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/publications',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'PATCH',
      url: `/publications/${id}`,
      payload: { stage: 'published' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.stage).toBe('published');
    expect(body.publishedAt).not.toBeNull();
  });

  it('editar com userId ≠ dono → 404 (não vaza existência)', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/publications',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'PATCH',
      url: `/publications/${id}`,
      payload: { title: 'hack' },
      headers: { authorization: `Bearer ${app.jwt.sign({ sub: 'intruder' })}` },
    });

    expect(res.statusCode).toBe(404);
  });
});

describe('POST /publications/:id/archive', () => {
  it('arquiva → 200, status=ARCHIVED', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/publications',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'POST',
      url: `/publications/${id}/archive`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ARCHIVED');
    expect(body.archivedAt).not.toBeNull();
  });
});

describe('GET /publications', () => {
  it('lista do usuário filtrando por stage', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/publications',
      payload: baseBody,
    });
    const id = created.json().id;
    await injectAuth({
      method: 'PATCH',
      url: `/publications/${id}`,
      payload: { stage: 'published' },
    });
    await injectAuth({
      method: 'POST',
      url: '/publications',
      payload: { ...baseBody, title: 'Outro rascunho' },
    });

    const res = await injectAuth({
      method: 'GET',
      url: `/publications?stage=published`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(id);
    expect(body[0].stage).toBe('published');
  });
});
