import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner'; // seeded user

async function clearResources() {
  await prisma.resource.deleteMany({ where: { userId: USER_ID } });
}

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

const baseBody = {
  userId: USER_ID,
  title: 'Domain-Driven Design',
  type: 'book',
};

let app: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
});

beforeEach(async () => {
  await clearResources();
});

afterAll(async () => {
  await clearResources();
  await prisma.$disconnect();
  await app.close();
});

describe('POST /resources', () => {
  it('cria recurso válido → 201, stage=backlog, status=ACTIVE', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.stage).toBe('backlog');
    expect(body.status).toBe('ACTIVE');
    expect(body.title).toBe('Domain-Driven Design');
    expect(body.userId).toBe(USER_ID);
  });

  it('rejeita body inválido (type fora do enum) → 400', async () => {
    const res = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: { userId: USER_ID, title: 'X', type: 'magazine' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /resources/:id', () => {
  it('retorna o recurso por id → 200', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'GET',
      url: `/resources/${id}?userId=${USER_ID}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
  });

  it('id inexistente → 404', async () => {
    const res = await injectAuth({
      method: 'GET',
      url: `/resources/ghost?userId=${USER_ID}`,
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('GET /resources', () => {
  it('lista do usuário filtrando por stage', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;
    await injectAuth({
      method: 'PATCH',
      url: `/resources/${id}`,
      payload: { userId: USER_ID, stage: 'done' },
    });
    await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: { userId: USER_ID, title: 'Outro', type: 'course' },
    });

    const res = await injectAuth({
      method: 'GET',
      url: `/resources?userId=${USER_ID}&stage=done`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(id);
    expect(body[0].stage).toBe('done');
  });
});

describe('GET /resources/:id/publications (transitivo)', () => {
  it('retorna posts diretos do recurso e de notas dele; ignora outro recurso', async () => {
    // Isola: limpa notas/publicações do usuário antes.
    await prisma.publication.deleteMany({ where: { userId: USER_ID } });
    await prisma.note.deleteMany({ where: { userId: USER_ID } });

    const resource = (
      await injectAuth({ method: 'POST', url: '/resources', payload: baseBody })
    ).json();

    // Nota vinculada ao recurso + publicação a partir dela.
    const note = (
      await injectAuth({
        method: 'POST',
        url: '/notes',
        payload: {
          type: 'NOTE',
          doc: {},
          date: '2026-06-10T00:00:00.000Z',
          resourceId: resource.id,
        },
      })
    ).json();
    const pFromNote = (
      await injectAuth({
        method: 'POST',
        url: '/publications',
        payload: {
          sourceType: 'note',
          sourceId: note.id,
          format: 'linkedin',
          title: 'Do fichamento',
        },
      })
    ).json();

    // Publicação direta do recurso.
    const pDirect = (
      await injectAuth({
        method: 'POST',
        url: '/publications',
        payload: {
          sourceType: 'resource',
          sourceId: resource.id,
          format: 'blog',
          title: 'Do recurso',
        },
      })
    ).json();

    // Recurso + nota + publicação de OUTRO recurso — não deve aparecer.
    const other = (
      await injectAuth({
        method: 'POST',
        url: '/resources',
        payload: { userId: USER_ID, title: 'Outro', type: 'book' },
      })
    ).json();
    const otherNote = (
      await injectAuth({
        method: 'POST',
        url: '/notes',
        payload: {
          type: 'NOTE',
          doc: {},
          date: '2026-06-10T00:00:00.000Z',
          resourceId: other.id,
        },
      })
    ).json();
    await injectAuth({
      method: 'POST',
      url: '/publications',
      payload: {
        sourceType: 'note',
        sourceId: otherNote.id,
        format: 'linkedin',
        title: 'De outro recurso',
      },
    });

    const res = await injectAuth({
      method: 'GET',
      url: `/resources/${resource.id}/publications`,
    });

    expect(res.statusCode).toBe(200);
    const ids = res.json().map((p: { id: string }) => p.id);
    expect(ids).toHaveLength(2);
    expect(ids).toContain(pFromNote.id);
    expect(ids).toContain(pDirect.id);
  });
});

describe('PATCH /resources/:id', () => {
  it('edita stage e title → 200', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'PATCH',
      url: `/resources/${id}`,
      payload: { userId: USER_ID, title: 'Novo título', stage: 'in_progress' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe('Novo título');
    expect(body.stage).toBe('in_progress');
  });

  it('editar com userId ≠ dono → 404 (não vaza existência)', async () => {
    const created = await injectAuth({
      method: 'POST',
      url: '/resources',
      payload: baseBody,
    });
    const id = created.json().id;

    const res = await injectAuth({
      method: 'PATCH',
      url: `/resources/${id}`,
      payload: { title: 'hack' },
      headers: { authorization: `Bearer ${app.jwt.sign({ sub: 'intruder' })}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
