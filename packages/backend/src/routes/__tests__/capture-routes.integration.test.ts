import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner'; // seeded user with settings

async function clearCaptures() {
  await prisma.capture.deleteMany({ where: { userId: USER_ID } });
}

const baseBody = { userId: USER_ID, text: 'ideia de teste' };

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

beforeEach(async () => {
  await clearCaptures();
});

afterAll(async () => {
  await clearCaptures();
  await prisma.$disconnect();
  await app.close();
});

describe('POST /captures', () => {
  it('cria captura válida → 201, status PENDING', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/captures',
      payload: baseBody,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.status).toBe('PENDING');
    expect(body.text).toBe('ideia de teste');
    expect(body.userId).toBe(USER_ID);
  });

  it('calcula reviewAt quando ausente no body', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/captures',
      payload: baseBody,
    });

    expect(res.statusCode).toBe(201);
    // reviewAt should be set (next reviewWeekday for owner)
    const body = res.json();
    expect(body.reviewAt).not.toBeNull();
  });

  it('text vazio → 400', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/captures',
      payload: { userId: USER_ID, text: '' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /captures', () => {
  it('status=PENDING retorna capturas a revisar (sem reviewAt aparecem sempre)', async () => {
    // Capture with explicit past reviewAt — always due
    await injectAuth({
      method: 'POST',
      url: '/captures',
      payload: {
        userId: USER_ID,
        text: 'vencida',
        reviewAt: '2020-01-01T00:00:00.000Z',
      },
    });
    // Capture with reviewAt=null created directly via Prisma (CreateCapture always sets a date)
    await prisma.capture.create({
      data: { userId: USER_ID, text: 'sem data', reviewAt: null },
    });

    const res = await injectAuth({
      method: 'GET',
      url: `/captures?userId=${USER_ID}&status=PENDING`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    const texts = body.map((c: { text: string }) => c.text);
    expect(texts).toContain('sem data');
    expect(texts).toContain('vencida');
  });

  it('status=ARCHIVED retorna só arquivadas', async () => {
    // Create an archived capture directly via Prisma (no archive route yet)
    await prisma.capture.create({
      data: {
        userId: USER_ID,
        text: 'arquivada',
        status: 'ARCHIVED',
        archivedAt: new Date(),
        archiveReason: 'test',
      },
    });

    const res = await injectAuth({
      method: 'GET',
      url: `/captures?userId=${USER_ID}&status=ARCHIVED`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.every((c: { status: string }) => c.status === 'ARCHIVED')).toBe(
      true,
    );
    expect(body.some((c: { text: string }) => c.text === 'arquivada')).toBe(
      true,
    );
  });
});
