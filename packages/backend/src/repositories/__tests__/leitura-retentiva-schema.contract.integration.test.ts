import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma, setupTestUser, TEST_USER_ID } from './_db.js';

// Smoke de contrato da migração Leitura Retentiva (Tarefa 58). Não testa regra de
// negócio — só garante que as novas tabelas, defaults e relações batem com o schema.
// O contrato real dos repositórios vem na Tarefa 61.

async function clearStudy() {
  await prisma.recall.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.studyItem.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.note.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.resource.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.label.deleteMany({ where: { userId: TEST_USER_ID } });
}

beforeAll(async () => {
  await setupTestUser();
});

beforeEach(async () => {
  await clearStudy();
});

afterAll(async () => {
  await clearStudy();
  await prisma.$disconnect();
});

describe('Leitura Retentiva schema contract', () => {
  it('cria StudyItem (com Resource e Label) → Recall e lê de volta com os defaults', async () => {
    const label = await prisma.label.create({
      data: { userId: TEST_USER_ID, name: 'Teologia' },
    });
    const resource = await prisma.resource.create({
      data: { userId: TEST_USER_ID, title: 'A Ressurreição', type: 'book' },
    });

    const item = await prisma.studyItem.create({
      data: {
        userId: TEST_USER_ID,
        title: 'Cap. 3 — A ressurreição em Paulo',
        reference: 'pp. 40–60',
        questions: { before: ['Que problema resolve?'], during: [], after: [] },
        resourceId: resource.id,
        labels: { connect: { id: label.id } },
      },
      include: { labels: true, resource: true },
    });

    // defaults do schema
    expect(item.status).toBe('ACTIVE');
    expect(item.archivedAt).toBeNull();
    expect(item.fichamentoNoteId).toBeNull();
    expect(item.resourceId).toBe(resource.id);
    expect(item.labels.map((l) => l.id)).toContain(label.id);

    const occurredAt = new Date('2026-06-27T09:00:00.000Z');
    const recall = await prisma.recall.create({
      data: {
        userId: TEST_USER_ID,
        studyItemId: item.id,
        confidence: 'B',
        occurredAt,
      },
    });

    expect(recall.note).toBeNull();
    expect(recall.confidence).toBe('B');
    expect(recall.occurredAt.toISOString()).toBe(occurredAt.toISOString());

    const itemWithRecalls = await prisma.studyItem.findUnique({
      where: { id: item.id },
      include: { recalls: true },
    });
    expect(itemWithRecalls?.recalls).toHaveLength(1);
    expect(itemWithRecalls?.recalls[0].id).toBe(recall.id);
  });

  it('cria StudyItem com fichamentoNoteId apontando para uma Note STUDY_NOTE', async () => {
    const note = await prisma.note.create({
      data: {
        userId: TEST_USER_ID,
        type: 'STUDY_NOTE',
        date: new Date('2026-06-27T00:00:00.000Z'),
        doc: { type: 'doc', content: [] },
      },
    });

    const item = await prisma.studyItem.create({
      data: {
        userId: TEST_USER_ID,
        title: 'Fichamento de memória',
        fichamentoNoteId: note.id,
      },
      include: { fichamentoNote: true },
    });

    expect(item.fichamentoNoteId).toBe(note.id);
    expect(item.fichamentoNote?.id).toBe(note.id);
    expect(item.resourceId).toBeNull();
  });
});
