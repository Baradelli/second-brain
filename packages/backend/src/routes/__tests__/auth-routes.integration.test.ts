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

  it('issues a token that EXPIRES (~15 days)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: EMAIL, password: 'correct-horse' },
    });

    const { exp, iat } = decodeJwtPayload(res.json().token);
    expect(typeof exp).toBe('number');
    expect(typeof iat).toBe('number');
    // 15 dias, com 1 minuto de folga para o relógio do teste.
    const fifteenDays = 15 * 24 * 60 * 60;
    expect((exp as number) - (iat as number)).toBeGreaterThan(fifteenDays - 60);
    expect((exp as number) - (iat as number)).toBeLessThanOrEqual(fifteenDays);
  });
});

describe('POST /auth/refresh', () => {
  async function login(): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: EMAIL, password: 'correct-horse' },
    });
    return res.json<{ token: string }>().token;
  }

  it('trades a valid token for a fresh one (sliding window)', async () => {
    const token = await login();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const fresh = res.json<{ token: string }>().token;
    expect(typeof fresh).toBe('string');
    const payload = decodeJwtPayload(fresh);
    expect(typeof payload['exp']).toBe('number');
    expect(payload['sub']).toBe(decodeJwtPayload(token)['sub']);
  });

  it('returns 401 without a token', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/refresh' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for a garbage token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    expect(res.statusCode).toBe(401);
  });
});

/** Decodifica o payload de um JWT (sem validar assinatura — só para asserts). */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1] as string;
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
}
