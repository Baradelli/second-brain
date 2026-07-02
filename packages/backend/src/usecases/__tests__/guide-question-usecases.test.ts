import { describe, expect, it } from 'vitest';

import {
  GuideQuestionNotFoundError,
  LabelNotFoundError,
} from '../../domain/errors.js';
import { GuideQuestionRepositoryFake } from '../_fakes/guide-question-repository-fake.js';
import { CreateGuideQuestion } from '../create-guide-question.js';
import { SuggestedQuestionsForNote } from '../suggested-questions-for-note.js';
import { ToggleGuideQuestion } from '../toggle-guide-question.js';

function repoWithLabels() {
  const repo = new GuideQuestionRepositoryFake();
  repo.addLabel({ id: 'book', userId: 'user-1', name: 'Book' });
  repo.addLabel({ id: 'history', userId: 'user-1', name: 'History' });
  repo.addLabel({ id: 'child', userId: 'user-1', name: 'Book child' });
  repo.addLabel({ id: 'other-user-label', userId: 'user-2', name: 'Private' });
  return repo;
}

describe('CreateGuideQuestion', () => {
  it('cria pergunta num label do usuário', async () => {
    const repo = repoWithLabels();
    const usecase = new CreateGuideQuestion(repo, () => 'q-1');

    const result = await usecase.execute({
      userId: 'user-1',
      labelId: 'book',
      text: 'Was it an easy read?',
      order: 2,
    });

    expect(result).toEqual({
      id: 'q-1',
      labelId: 'book',
      text: 'Was it an easy read?',
      order: 2,
      active: true,
    });
  });

  it('rejeita label inexistente ou de outro usuário', async () => {
    const repo = repoWithLabels();
    const usecase = new CreateGuideQuestion(repo);

    await expect(
      usecase.execute({ userId: 'user-1', labelId: 'missing', text: 'x' }),
    ).rejects.toThrow(LabelNotFoundError);
    await expect(
      usecase.execute({
        userId: 'user-1',
        labelId: 'other-user-label',
        text: 'x',
      }),
    ).rejects.toThrow(LabelNotFoundError);
  });
});

describe('ToggleGuideQuestion', () => {
  it('desativa sem apagar; desativadas não aparecem nas sugestões', async () => {
    const repo = repoWithLabels();
    await new CreateGuideQuestion(repo, () => 'q-1').execute({
      userId: 'user-1',
      labelId: 'book',
      text: 'Question',
    });

    const toggled = await new ToggleGuideQuestion(repo).execute({
      id: 'q-1',
      userId: 'user-1',
      active: false,
    });
    const suggestions = await new SuggestedQuestionsForNote(repo).execute({
      labelIds: ['book'],
    });

    expect(toggled.active).toBe(false);
    expect(await repo.byId('q-1')).not.toBeNull();
    expect(suggestions).toEqual([]);
  });

  it('lança erro para pergunta inexistente', async () => {
    const repo = repoWithLabels();

    await expect(
      new ToggleGuideQuestion(repo).execute({
        id: 'missing',
        userId: 'user-1',
        active: false,
      }),
    ).rejects.toThrow(GuideQuestionNotFoundError);
  });
});

describe('SuggestedQuestionsForNote', () => {
  it('agrupa por label, ordena por order e omite labels sem pergunta', async () => {
    const repo = repoWithLabels();
    await new CreateGuideQuestion(repo, () => 'q-2').execute({
      userId: 'user-1',
      labelId: 'book',
      text: 'Second',
      order: 2,
    });
    await new CreateGuideQuestion(repo, () => 'q-1').execute({
      userId: 'user-1',
      labelId: 'book',
      text: 'First',
      order: 1,
    });
    await new CreateGuideQuestion(repo, () => 'q-3').execute({
      userId: 'user-1',
      labelId: 'history',
      text: 'History question',
      order: 0,
    });

    const result = await new SuggestedQuestionsForNote(repo).execute({
      labelIds: ['book', 'history', 'child'],
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.label).toEqual({ id: 'book', name: 'Book' });
    expect(result[0]?.questions.map((q) => q.text)).toEqual([
      'First',
      'Second',
    ]);
    expect(result[1]?.label).toEqual({ id: 'history', name: 'History' });
  });

  it('não herda perguntas da árvore: pergunta de Book não aparece só com label filho', async () => {
    const repo = repoWithLabels();
    await new CreateGuideQuestion(repo, () => 'q-1').execute({
      userId: 'user-1',
      labelId: 'book',
      text: 'Book question',
    });

    const result = await new SuggestedQuestionsForNote(repo).execute({
      labelIds: ['child'],
    });

    expect(result).toEqual([]);
  });
});
