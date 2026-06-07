import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner';

async function clearNotes() {
  await prisma.note.deleteMany({ where: { userId: USER_ID } });
}

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await clearNotes();
});

afterAll(async () => {
  await clearNotes();
  await prisma.$disconnect();
  await app.close();
});

describe('POST /recaps', () => {
  it('cria o recap do período (scope/type corretos)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/recaps',
      payload: { userId: USER_ID, type: 'REFLECTION', scope: 'WEEK' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.scope).toBe('WEEK');
    expect(body.type).toBe('REFLECTION');
    expect(body.id).toBeTruthy();
  });

  it('é idempotente no período (devolve o mesmo recap)', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/recaps',
      payload: { userId: USER_ID, type: 'DEVOTIONAL', scope: 'MONTH' },
    });
    const second = await app.inject({
      method: 'POST',
      url: '/recaps',
      payload: { userId: USER_ID, type: 'DEVOTIONAL', scope: 'MONTH' },
    });

    expect(first.json().id).toBe(second.json().id);
  });

  it('rejeita scope inválido (Zod) → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/recaps',
      payload: { userId: USER_ID, type: 'REFLECTION', scope: 'DAY' },
    });
    expect(res.statusCode).toBe(400);
  });
});
