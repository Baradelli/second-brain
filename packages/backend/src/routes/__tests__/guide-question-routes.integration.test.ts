import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildServer } from '../../http/server.js';

const prisma = new PrismaClient();
const USER_ID = 'owner';
const OTHER_USER_ID = 'guide-question-route-other';

let app: Awaited<ReturnType<typeof buildServer>>;

async function clearData() {
  await prisma.guideQuestion.deleteMany({
    where: { label: { userId: { in: [USER_ID, OTHER_USER_ID] } } },
  });
  await prisma.label.deleteMany({ where: { userId: OTHER_USER_ID } });
  await prisma.label.deleteMany({ where: { userId: USER_ID } });
}

async function createLabel(name: string, parentId?: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/labels',
    payload: { userId: USER_ID, name, parentId },
  });
  expect(res.statusCode).toBe(201);
  return res.json() as { id: string; name: string };
}

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
  await prisma.user.upsert({
    where: { id: OTHER_USER_ID },
    update: {},
    create: {
      id: OTHER_USER_ID,
      email: 'guide-question-route-other@cerebro.local',
      name: 'Guide Question Route Other',
    },
  });
});

beforeEach(async () => {
  await clearData();
});

afterAll(async () => {
  await clearData();
  await prisma.user.deleteMany({ where: { id: OTHER_USER_ID } });
  await prisma.$disconnect();
  await app.close();
});

describe('guide question routes', () => {
  it('POST /labels/:id/questions cria pergunta em label do usuário', async () => {
    const label = await createLabel('Book');

    const res = await app.inject({
      method: 'POST',
      url: `/labels/${label.id}/questions`,
      payload: { userId: USER_ID, text: 'Was it an easy read?', order: 1 },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      labelId: label.id,
      text: 'Was it an easy read?',
      order: 1,
      active: true,
    });
  });

  it('POST /labels/:id/questions rejeita label de outro usuário', async () => {
    const other = await prisma.label.create({
      data: { userId: OTHER_USER_ID, name: 'Private' },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/labels/${other.id}/questions`,
      payload: { userId: USER_ID, text: 'Nope' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('GET /notes/suggested-questions agrupa e ordena perguntas ativas', async () => {
    const book = await createLabel('Book');
    const history = await createLabel('History');
    const empty = await createLabel('Empty');

    await app.inject({
      method: 'POST',
      url: `/labels/${book.id}/questions`,
      payload: { userId: USER_ID, text: 'Second', order: 2 },
    });
    await app.inject({
      method: 'POST',
      url: `/labels/${book.id}/questions`,
      payload: { userId: USER_ID, text: 'First', order: 1 },
    });
    await app.inject({
      method: 'POST',
      url: `/labels/${history.id}/questions`,
      payload: { userId: USER_ID, text: 'History question' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/notes/suggested-questions?labelIds=${book.id},${history.id},${empty.id}`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
    expect(body[0].label).toEqual({ id: book.id, name: 'Book' });
    expect(body[0].questions.map((q: { text: string }) => q.text)).toEqual([
      'First',
      'Second',
    ]);
    expect(body[1].label).toEqual({ id: history.id, name: 'History' });
  });

  it('POST /guide-questions/:id/toggle desativa sem apagar e remove das sugestões', async () => {
    const label = await createLabel('Book');
    const created = await app.inject({
      method: 'POST',
      url: `/labels/${label.id}/questions`,
      payload: { userId: USER_ID, text: 'Question' },
    });
    const questionId = created.json().id;

    const toggle = await app.inject({
      method: 'POST',
      url: `/guide-questions/${questionId}/toggle`,
      payload: { active: false },
    });
    const suggestions = await app.inject({
      method: 'GET',
      url: `/notes/suggested-questions?labelIds=${label.id}`,
    });

    expect(toggle.statusCode).toBe(200);
    expect(toggle.json().active).toBe(false);
    expect(suggestions.json()).toEqual([]);
  });

  it('não herda pela árvore: pergunta do pai não aparece quando só o filho é pedido', async () => {
    const parent = await createLabel('Book');
    const child = await createLabel('History', parent.id);
    await app.inject({
      method: 'POST',
      url: `/labels/${parent.id}/questions`,
      payload: { userId: USER_ID, text: 'Parent question' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/notes/suggested-questions?labelIds=${child.id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});
