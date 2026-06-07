import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner';

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

async function clearLabels() {
  await prisma.capture.deleteMany({ where: { userId: USER_ID } });
  await prisma.note.deleteMany({ where: { userId: USER_ID } });
  await prisma.label.deleteMany({ where: { userId: USER_ID } });
}

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await clearLabels();
});

afterAll(async () => {
  await clearLabels();
  await prisma.$disconnect();
  await app.close();
});

describe('label routes', () => {
  it('POST /labels cria label raiz', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'Book', color: '#ffcc00' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Book');
    expect(body.parentId).toBeNull();
    expect(body.status).toBe('ACTIVE');
  });

  it('POST /labels cria filho com parentId válido', async () => {
    const parent = await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'Book' },
    });
    const parentId = parent.json().id;

    const child = await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'History', parentId },
    });

    expect(child.statusCode).toBe(201);
    expect(child.json().parentId).toBe(parentId);
  });

  it('POST /labels rejeita parentId inexistente', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'History', parentId: 'missing' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('GET /labels retorna árvore de labels ativos', async () => {
    const parent = await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'Book' },
    });
    const parentId = parent.json().id;
    await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'History', parentId },
    });

    const res = await injectAuth({
      method: 'GET',
      url: `/labels?userId=${USER_ID}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Book');
    expect(body[0].children[0].name).toBe('History');
  });

  it('PATCH /labels/:id renomeia e troca cor → 200', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'Antigo' },
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'PATCH',
      url: `/labels/${id}`,
      payload: { userId: USER_ID, name: 'Novo', color: '#6D5DFC' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Novo');
    expect(res.json().color).toBe('#6D5DFC');
  });

  it('PATCH /labels/:id com token de outro dono → 404', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { name: 'Minha' },
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'PATCH',
      url: `/labels/${id}`,
      payload: { name: 'hack' },
      headers: { authorization: `Bearer ${app.jwt.sign({ sub: 'intruder' })}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('POST /labels/:id/archive arquiva label sem uso', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'Unused' },
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'POST',
      url: `/labels/${id}/archive`,
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ARCHIVED');
  });

  it('POST /labels/:id/archive bloqueia label com filho ativo', async () => {
    const parent = await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'Book' },
    });
    const parentId = parent.json().id;
    await injectAuth({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'History', parentId },
    });

    const res = await injectAuth({
      method: 'POST',
      url: `/labels/${parentId}/archive`,
      payload: {},
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toContain('active child');
  });
});
