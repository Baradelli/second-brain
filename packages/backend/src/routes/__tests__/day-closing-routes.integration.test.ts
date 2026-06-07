import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner';

async function clearGoals() {
  await prisma.event.deleteMany({ where: { userId: USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: USER_ID } });
}

let app: Awaited<ReturnType<typeof buildServer>>;

// Injeta o header de auth (JWT do usuário de teste) em toda chamada.
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
  await clearGoals();
});

afterAll(async () => {
  await clearGoals();
  await prisma.$disconnect();
  await app.close();
});

describe('GET /day-closing', () => {
  it('returns 200 with date and pending array', async () => {
    const res = await injectAuth({
      method: 'GET',
      url: `/day-closing?userId=${USER_ID}&day=today`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(body.pending)).toBe(true);
  });
});
