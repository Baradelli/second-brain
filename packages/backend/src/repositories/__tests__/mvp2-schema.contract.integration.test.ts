import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma, setupTestUser, TEST_USER_ID } from './_db.js';

// Smoke de contrato da migração MVP 2 (Tarefa 25). Não testa regra de negócio —
// só garante que as novas tabelas, defaults e relações batem com o schema.
// O contrato real de cada repositório vem em 27/30/35.

async function clearMvp2() {
  await prisma.event.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.note.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.resource.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.label.deleteMany({ where: { userId: TEST_USER_ID } });
}

beforeAll(async () => {
  await setupTestUser();
});

beforeEach(async () => {
  await clearMvp2();
});

afterAll(async () => {
  await clearMvp2();
  await prisma.$disconnect();
});

describe('MVP 2 schema contract', () => {
  it('cria User → Goal → Event e lê de volta com os defaults do schema', async () => {
    const goal = await prisma.goal.create({
      data: { userId: TEST_USER_ID, title: 'Ler todo dia', type: 'HABIT' },
    });

    // weekdays default = [] e status default = ACTIVE
    expect(goal.weekdays).toEqual([]);
    expect(goal.status).toBe('ACTIVE');
    expect(goal.completedAt).toBeNull();
    expect(goal.parentId).toBeNull();

    const occurredAt = new Date('2026-06-04T09:00:00.000Z');
    const event = await prisma.event.create({
      data: { userId: TEST_USER_ID, goalId: goal.id, type: 'done', occurredAt },
    });

    expect(event.value).toBeNull();
    expect(event.reason).toBeNull();
    expect(event.occurredAt.toISOString()).toBe(occurredAt.toISOString());

    const goalWithEvents = await prisma.goal.findUnique({
      where: { id: goal.id },
      include: { events: true },
    });
    expect(goalWithEvents?.events).toHaveLength(1);
    expect(goalWithEvents?.events[0].id).toBe(event.id);
  });

  it('cria Goal filho de UMBRELLA via relação GoalTree (parent/children)', async () => {
    const umbrella = await prisma.goal.create({
      data: { userId: TEST_USER_ID, title: 'Saúde', type: 'UMBRELLA' },
    });
    const child = await prisma.goal.create({
      data: {
        userId: TEST_USER_ID,
        title: 'Correr',
        type: 'TARGET',
        targetValue: 100,
        unit: 'km',
        parentId: umbrella.id,
      },
    });

    const loaded = await prisma.goal.findUnique({
      where: { id: umbrella.id },
      include: { children: true },
    });
    expect(loaded?.children.map((c) => c.id)).toContain(child.id);
    expect(child.targetValue).toBe(100);
  });

  it('cria Resource ligado a Label (relação ResourceLabels) com stage default', async () => {
    const label = await prisma.label.create({
      data: { userId: TEST_USER_ID, name: 'Tech' },
    });
    const resource = await prisma.resource.create({
      data: {
        userId: TEST_USER_ID,
        title: 'Domain-Driven Design',
        type: 'book',
        labels: { connect: { id: label.id } },
      },
      include: { labels: true },
    });

    expect(resource.stage).toBe('backlog');
    expect(resource.status).toBe('ACTIVE');
    expect(resource.labels.map((l) => l.id)).toContain(label.id);
  });

  it('cria Note com goalId e resourceId (FKs opcionais do MVP 2)', async () => {
    const goal = await prisma.goal.create({
      data: { userId: TEST_USER_ID, title: 'Projeto', type: 'PROJECT' },
    });
    const resource = await prisma.resource.create({
      data: { userId: TEST_USER_ID, title: 'Artigo', type: 'article' },
    });
    const note = await prisma.note.create({
      data: {
        userId: TEST_USER_ID,
        type: 'STUDY_NOTE',
        date: new Date('2026-06-04T00:00:00.000Z'),
        doc: { type: 'doc', content: [] },
        goalId: goal.id,
        resourceId: resource.id,
      },
      include: { goal: true, resource: true },
    });

    expect(note.goalId).toBe(goal.id);
    expect(note.resourceId).toBe(resource.id);
    expect(note.goal?.id).toBe(goal.id);
    expect(note.resource?.id).toBe(resource.id);
  });
});
