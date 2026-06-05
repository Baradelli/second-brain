import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner'; // seeded user

async function clearResources() {
  await prisma.resource.deleteMany({ where: { userId: USER_ID } });
}

const baseBody = { userId: USER_ID, title: 'Domain-Driven Design', type: 'book' };

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await clearResources();
});

afterAll(async () => {
  await clearResources();
  await prisma.$disconnect();
  await app.close();
});

describe('POST /resources', () => {
  it('cria recurso válido → 201, stage=backlog, status=ACTIVE', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.stage).toBe('backlog');
    expect(body.status).toBe('ACTIVE');
    expect(body.title).toBe('Domain-Driven Design');
    expect(body.userId).toBe(USER_ID);
  });

  it('rejeita body inválido (type fora do enum) → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/resources',
      payload: { userId: USER_ID, title: 'X', type: 'magazine' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /resources', () => {
  it('lista do usuário filtrando por stage', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;
    await app.inject({
      method: 'PATCH',
      url: `/resources/${id}`,
      payload: { userId: USER_ID, stage: 'done' },
    });
    await app.inject({
      method: 'POST',
      url: '/resources',
      payload: { userId: USER_ID, title: 'Outro', type: 'course' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/resources?userId=${USER_ID}&stage=done`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(id);
    expect(body[0].stage).toBe('done');
  });
});

describe('PATCH /resources/:id', () => {
  it('edita stage e title → 200', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/resources/${id}`,
      payload: { userId: USER_ID, title: 'Novo título', stage: 'in_progress' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe('Novo título');
    expect(body.stage).toBe('in_progress');
  });

  it('editar com userId ≠ dono → 404 (não vaza existência)', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/resources/${id}`,
      payload: { userId: 'intruder', title: 'hack' },
    });

    expect(res.statusCode).toBe(404);
  });
});
