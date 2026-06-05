import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner'; // seeded user

async function clearAll() {
  await prisma.event.deleteMany({ where: { userId: USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: USER_ID } });
}

async function createGoal(payload: Record<string, unknown>): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/goals', payload });
  return res.json().id;
}

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

describe('POST /goals/:id/check', () => {
  it('TARGET with value → 201 done event', async () => {
    const id = await createGoal({
      userId: USER_ID,
      title: 'Correr',
      type: 'TARGET',
      targetValue: 100,
    });

    const res = await app.inject({
      method: 'POST',
      url: `/goals/${id}/check`,
      payload: { userId: USER_ID, value: 10 },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.type).toBe('done');
    expect(body.value).toBe(10);
  });

  it('checking an UMBRELLA → 400', async () => {
    const id = await createGoal({
      userId: USER_ID,
      title: 'Saúde',
      type: 'UMBRELLA',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/goals/${id}/check`,
      payload: { userId: USER_ID },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('POST /goals/:id/skip', () => {
  it('without reason → 400 (Zod)', async () => {
    const id = await createGoal({
      userId: USER_ID,
      title: 'Ler',
      type: 'HABIT',
      weekdays: [1],
    });

    const res = await app.inject({
      method: 'POST',
      url: `/goals/${id}/skip`,
      payload: { userId: USER_ID },
    });

    expect(res.statusCode).toBe(400);
  });

  it('with reason → 201 skip event', async () => {
    const id = await createGoal({
      userId: USER_ID,
      title: 'Ler',
      type: 'HABIT',
      weekdays: [1],
    });

    const res = await app.inject({
      method: 'POST',
      url: `/goals/${id}/skip`,
      payload: { userId: USER_ID, reason: 'estava viajando' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.type).toBe('skip');
    expect(body.reason).toBe('estava viajando');
  });
});

describe('DELETE /events/:id', () => {
  it('undoes a check (204) and the event is gone', async () => {
    const id = await createGoal({
      userId: USER_ID,
      title: 'Correr',
      type: 'TARGET',
      targetValue: 100,
    });
    const checked = await app.inject({
      method: 'POST',
      url: `/goals/${id}/check`,
      payload: { userId: USER_ID, value: 5 },
    });
    const eventId = checked.json().id;

    const del = await app.inject({
      method: 'DELETE',
      url: `/events/${eventId}`,
      payload: { userId: USER_ID },
    });
    expect(del.statusCode).toBe(204);

    // gone — progress should be back to 0
    const progress = await app.inject({
      method: 'GET',
      url: `/goals/${id}/progress?userId=${USER_ID}`,
    });
    expect(progress.json().done).toBe(0);
  });

  it('undoing a skip → 400', async () => {
    const id = await createGoal({
      userId: USER_ID,
      title: 'Ler',
      type: 'HABIT',
      weekdays: [1],
    });
    const skipped = await app.inject({
      method: 'POST',
      url: `/goals/${id}/skip`,
      payload: { userId: USER_ID, reason: 'x' },
    });
    const eventId = skipped.json().id;

    const del = await app.inject({
      method: 'DELETE',
      url: `/events/${eventId}`,
      payload: { userId: USER_ID },
    });
    expect(del.statusCode).toBe(400);
  });
});

describe('GET /goals/:id/progress', () => {
  it('returns computed progress for a TARGET → 200', async () => {
    const id = await createGoal({
      userId: USER_ID,
      title: 'Correr',
      type: 'TARGET',
      targetValue: 100,
    });
    await app.inject({
      method: 'POST',
      url: `/goals/${id}/check`,
      payload: { userId: USER_ID, value: 40 },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/goals/${id}/progress?userId=${USER_ID}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.done).toBe(40);
    expect(body.target).toBe(100);
    expect(body.ratio).toBeCloseTo(0.4, 5);
  });
});
