import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner';

let app: Awaited<ReturnType<typeof buildServer>>;

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
    const res = await app.inject({
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
    const parent = await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'Book' },
    });
    const parentId = parent.json().id;

    const child = await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'History', parentId },
    });

    expect(child.statusCode).toBe(201);
    expect(child.json().parentId).toBe(parentId);
  });

  it('POST /labels rejeita parentId inexistente', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'History', parentId: 'missing' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('GET /labels retorna árvore de labels ativos', async () => {
    const parent = await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'Book' },
    });
    const parentId = parent.json().id;
    await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'History', parentId },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/labels?userId=${USER_ID}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Book');
    expect(body[0].children[0].name).toBe('History');
  });

  it('POST /labels/:id/archive arquiva label sem uso', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'Unused' },
    });
    const id = created.json().id;

    const res = await app.inject({
      method: 'POST',
      url: `/labels/${id}/archive`,
      payload: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ARCHIVED');
  });

  it('POST /labels/:id/archive bloqueia label com filho ativo', async () => {
    const parent = await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'Book' },
    });
    const parentId = parent.json().id;
    await app.inject({
      method: 'POST',
      url: '/labels',
      payload: { userId: USER_ID, name: 'History', parentId },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/labels/${parentId}/archive`,
      payload: {},
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toContain('active child');
  });
});
