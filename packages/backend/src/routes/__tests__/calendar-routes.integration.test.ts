import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe('GET /calendar', () => {
  it('returns 200 with the month and one entry per day', async () => {
    const res = await injectAuth({
      method: 'GET',
      url: `/calendar?userId=${USER_ID}&month=2026-06`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.month).toBe('2026-06');
    expect(Array.isArray(body.days)).toBe(true);
    expect(body.days).toHaveLength(30);
    expect(body.days[0]).toMatchObject({
      date: '2026-06-01',
      goalsPlanned: expect.any(Number),
      goalsDone: expect.any(Number),
      journal: {
        devotional: expect.any(Boolean),
        reflection: expect.any(Boolean),
      },
    });
  });

  it('rejects a request without a token → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/calendar?month=2026-06',
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /calendar/day', () => {
  it('returns 200 with date, goals and notes', async () => {
    const res = await injectAuth({
      method: 'GET',
      url: `/calendar/day?userId=${USER_ID}&date=2026-06-03`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.date).toBe('2026-06-03');
    expect(Array.isArray(body.goals)).toBe(true);
    expect(Array.isArray(body.notes)).toBe(true);
  });

  it('rejects a malformed date (Zod) → 400', async () => {
    const res = await injectAuth({
      method: 'GET',
      url: `/calendar/day?userId=${USER_ID}&date=2026-6-3`,
    });
    expect(res.statusCode).toBe(400);
  });
});
