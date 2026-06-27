import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma, setupTestUser, TEST_USER_ID } from './_db.js';

// Smoke de contrato da migração Publication (Tarefa 66, Bloco O). Não testa regra de
// negócio — só garante que a nova tabela, defaults e relações batem com o schema.
// O contrato real do repositório vem na Tarefa 67. Mirror da 58.

async function clearPublication() {
  await prisma.publication.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.note.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.label.deleteMany({ where: { userId: TEST_USER_ID } });
}

beforeAll(async () => {
  await setupTestUser();
});

beforeEach(async () => {
  await clearPublication();
});

afterAll(async () => {
  await clearPublication();
  await prisma.$disconnect();
});

describe('Publication schema contract', () => {
  it('cria Publication (com noteId → Note e um Label) e lê de volta com os defaults', async () => {
    const label = await prisma.label.create({
      data: { userId: TEST_USER_ID, name: 'Teologia' },
    });
    const note = await prisma.note.create({
      data: {
        userId: TEST_USER_ID,
        type: 'NOTE',
        date: new Date('2026-06-27T00:00:00.000Z'),
        doc: { type: 'doc', content: [] },
      },
    });

    const publication = await prisma.publication.create({
      data: {
        userId: TEST_USER_ID,
        sourceType: 'study_item',
        sourceId: 'study-item-xyz',
        format: 'blog',
        title: 'A ressurreição em Paulo — rascunho de post',
        noteId: note.id,
        labels: { connect: { id: label.id } },
      },
      include: { labels: true, note: true },
    });

    // defaults do schema
    expect(publication.stage).toBe('idea');
    expect(publication.status).toBe('ACTIVE');
    expect(publication.archivedAt).toBeNull();
    expect(publication.publishedAt).toBeNull();
    expect(publication.noteId).toBe(note.id);
    expect(publication.note?.id).toBe(note.id);
    expect(publication.labels.map((l) => l.id)).toContain(label.id);

    const back = await prisma.publication.findUnique({
      where: { id: publication.id },
    });
    expect(back?.sourceType).toBe('study_item');
    expect(back?.sourceId).toBe('study-item-xyz');
    expect(back?.format).toBe('blog');
  });

  it('cria Publication sem noteId (fonte polimórfica, rascunho ainda não escrito)', async () => {
    const publication = await prisma.publication.create({
      data: {
        userId: TEST_USER_ID,
        sourceType: 'recap',
        sourceId: 'recap-2026-W26',
        format: 'linkedin',
        title: 'Recap da semana → post',
      },
    });

    expect(publication.noteId).toBeNull();
    expect(publication.stage).toBe('idea');
    expect(publication.status).toBe('ACTIVE');
  });
});
