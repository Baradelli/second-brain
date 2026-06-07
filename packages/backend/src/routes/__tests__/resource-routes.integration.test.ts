import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner'; // seeded user

async function clearResources() {
  await prisma.resource.deleteMany({ where: { userId: USER_ID } });
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
  title: 'Domain-Driven Design',
  type: 'book',
};

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
    const res = await injectAuth({
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
    const res = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: { userId: USER_ID, title: 'X', type: 'magazine' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /resources/:id', () => {
  it('retorna o recurso por id → 200', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'GET',
      url: `/resources/${id}?userId=${USER_ID}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
  });

  it('id inexistente → 404', async () => {
    const res = await injectAuth({
      method: 'GET',
      url: `/resources/ghost?userId=${USER_ID}`,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /resources', () => {
  it('lista do usuário filtrando por stage', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;
    await injectAuth({
      method: 'PATCH',
      url: `/resources/${id}`,
      payload: { userId: USER_ID, stage: 'done' },
    });
    await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: { userId: USER_ID, title: 'Outro', type: 'course' },
    });

    const res = await injectAuth({
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
    const created = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
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
    const created = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'PATCH',
      url: `/resources/${id}`,
      payload: { title: 'hack' },
      headers: { authorization: `Bearer ${app.jwt.sign({ sub: 'intruder' })}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
