import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner';

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe('GET /search', () => {
  it('returns the three result groups', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/search?userId=${USER_ID}&q=zzz`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.notes)).toBe(true);
    expect(Array.isArray(body.resources)).toBe(true);
    expect(Array.isArray(body.captures)).toBe(true);
  });

  it('rejects an empty query (Zod) → 400', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/search?userId=${USER_ID}&q=`,
    });
    expect(res.statusCode).toBe(400);
  });
});
