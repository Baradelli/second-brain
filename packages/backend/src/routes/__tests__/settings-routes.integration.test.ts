import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'settings-test-user';

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
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: 'settings-test@cerebro.local' },
  });
});

beforeEach(async () => {
  await prisma.settings.deleteMany({ where: { userId: USER_ID } });
});

afterAll(async () => {
  await prisma.settings.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.$disconnect();
  await app.close();
});

describe('GET /settings', () => {
  it('retorna defaults quando não há configurações', async () => {
    const res = await injectAuth({ method: 'GET', url: '/settings' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.timezone).toBe('America/Sao_Paulo');
    expect(body.reviewWeekday).toBe(0);
  });

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/settings' });
    expect(res.statusCode).toBe(401);
  });
});

describe('PATCH /settings', () => {
  it('atualiza timezone e weekday → 200 refletido', async () => {
    const res = await injectAuth({
      method: 'PATCH',
      url: '/settings',
      payload: { timezone: 'Europe/Lisbon', reviewWeekday: 1 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().timezone).toBe('Europe/Lisbon');
    expect(res.json().reviewWeekday).toBe(1);

    const get = await injectAuth({ method: 'GET', url: '/settings' });
    expect(get.json().timezone).toBe('Europe/Lisbon');
  });

  it('rejeita horário inválido (Zod) → 400', async () => {
    const res = await injectAuth({
      method: 'PATCH',
      url: '/settings',
      payload: { devotionalTime: '7h' },
    });
    expect(res.statusCode).toBe(400);
  });
});
