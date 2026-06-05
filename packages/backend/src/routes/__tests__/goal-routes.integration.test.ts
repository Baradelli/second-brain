import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner'; // seeded user

async function clearGoals() {
  await prisma.goal.deleteMany({ where: { userId: USER_ID } });
}

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await clearGoals();
});

afterAll(async () => {
  await clearGoals();
  await prisma.$disconnect();
  await app.close();
});

describe('POST /goals', () => {
  it('cria HABIT válido → 201, status ACTIVE', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/goals',
      payload: {
        userId: USER_ID,
        title: 'Ler',
        type: 'HABIT',
        weekdays: [1, 3, 5],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.type).toBe('HABIT');
    expect(body.status).toBe('ACTIVE');
    expect(body.weekdays).toEqual([1, 3, 5]);
  });

  it('rejeita HABIT com duas cadências → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/goals',
      payload: {
        userId: USER_ID,
        title: 'x',
        type: 'HABIT',
        weekdays: [1],
        period: 'week',
        timesPerPeriod: 2,
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /goals', () => {
  it('lista ativos do usuário', async () => {
    await app.inject({
      method: 'POST',
      url: '/goals',
      payload: { userId: USER_ID, title: 'A', type: 'HABIT', weekdays: [2] },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/goals?userId=${USER_ID}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe('A');
  });
});

describe('PATCH /goals/:id', () => {
  it('edita título → 200', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/goals',
      payload: { userId: USER_ID, title: 'Antigo', type: 'HABIT', weekdays: [1] },
    });
    const id = created.json().id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/goals/${id}`,
      payload: { userId: USER_ID, title: 'Novo' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('Novo');
  });

  it('editar com userId ≠ dono → 404', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/goals',
      payload: { userId: USER_ID, title: 'X', type: 'HABIT', weekdays: [1] },
    });
    const id = created.json().id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/goals/${id}`,
      payload: { userId: 'intruder', title: 'hack' },
    });

    expect(res.statusCode).toBe(404);
  });
});
