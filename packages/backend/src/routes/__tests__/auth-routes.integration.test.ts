import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const EMAIL = 'login-test@cerebro.local';

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.user.create({
    data: {
      email: EMAIL,
      name: 'Login Test',
      passwordHash: await bcrypt.hash('correct-horse', 10),
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.$disconnect();
  await app.close();
});

describe('POST /auth/login', () => {
  it('returns a JWT for valid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: EMAIL, password: 'correct-horse' },
    });

    expect(res.statusCode).toBe(200);
    expect(typeof res.json().token).toBe('string');
    expect(res.json().token.length).toBeGreaterThan(10);
  });

  it('returns 401 for a wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: EMAIL, password: 'nope' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 400 for a malformed email (Zod)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'not-an-email', password: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });
});
