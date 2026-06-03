import { describe, expect, it } from 'vitest';

import type { GuideQuestion } from '../../../domain/guide-question.js';
import { GuideQuestionRepositoryFake } from '../guide-question-repository-fake.js';

function question(overrides?: Partial<GuideQuestion>): GuideQuestion {
  return {
    id: 'q-1',
    labelId: 'label-1',
    text: 'Was it useful?',
    order: 0,
    active: true,
    ...overrides,
  };
}

describe('GuideQuestionRepositoryFake', () => {
  it('labelById retorna label cadastrado', async () => {
    const repo = new GuideQuestionRepositoryFake();
    repo.addLabel({ id: 'label-1', userId: 'user-1', name: 'Book' });

    expect(await repo.labelById('label-1')).toMatchObject({ name: 'Book' });
  });

  it('save + byId retorna a mesma pergunta', async () => {
    const repo = new GuideQuestionRepositoryFake();
    await repo.save(question());

    expect(await repo.byId('q-1')).toMatchObject({ text: 'Was it useful?' });
  });

  it('update aplica patch e persiste', async () => {
    const repo = new GuideQuestionRepositoryFake();
    await repo.save(question());

    const updated = await repo.update('q-1', { active: false });

    expect(updated.active).toBe(false);
    expect((await repo.byId('q-1'))?.active).toBe(false);
  });

  it('findActiveByLabelIds retorna só ativas com os labels pedidos', async () => {
    const repo = new GuideQuestionRepositoryFake();
    repo.addLabel({ id: 'label-1', userId: 'user-1', name: 'Book' });
    repo.addLabel({ id: 'label-2', userId: 'user-1', name: 'History' });
    await repo.save(question({ id: 'q-active', labelId: 'label-1' }));
    await repo.save(
      question({ id: 'q-inactive', labelId: 'label-1', active: false }),
    );
    await repo.save(question({ id: 'q-other', labelId: 'label-2' }));

    const result = await repo.findActiveByLabelIds(['label-1']);

    expect(result.map((row) => row.question.id)).toEqual(['q-active']);
  });
});
