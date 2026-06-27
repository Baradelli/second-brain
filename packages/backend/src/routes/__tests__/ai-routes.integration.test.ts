import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner'; // seeded user

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

async function setAiMode(mode: 'cheap' | 'connected') {
  await prisma.settings.upsert({
    where: { userId: USER_ID },
    update: { aiMode: mode },
    create: { userId: USER_ID, aiMode: mode },
  });
}

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await setAiMode('cheap');
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe('POST /ai/run (modo cheap)', () => {
  it('no modo cheap ecoa o prompt montado (a IA não executa nada) → 200', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/ai/run',
      payload: {
        skill: 'study.questions',
        context: { title: 'A ressurreição em Paulo' },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    // o texto ecoado carrega o prompt: a moldura §9 + o conteúdo interpolado
    expect(body.text).toContain('A ressurreição em Paulo');
    expect(body.text).toContain('espelho'); // moldura do §9 no system
  });

  it('rejeita body inválido (skill desconhecida) → 400', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/ai/run',
      payload: { skill: 'study.unknown', context: { title: 'X' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejeita body inválido (contexto faltando campo obrigatório) → 400', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/ai/run',
      payload: { skill: 'publish.draft', context: { format: 'blog' } },
    });
    expect(res.statusCode).toBe(400);
  });
});
