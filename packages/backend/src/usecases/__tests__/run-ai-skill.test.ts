import { beforeEach, describe, expect, it } from 'vitest';

import { AiRunnerFake } from '../_fakes/ai-runner-fake.js';
import { RunAiSkill } from '../run-ai-skill.js';

describe('RunAiSkill', () => {
  let runner: AiRunnerFake;
  let useCase: RunAiSkill;

  beforeEach(() => {
    runner = new AiRunnerFake();
    useCase = new RunAiSkill(runner);
  });

  it('builds the prompt for the skill and passes it to the runner', async () => {
    runner.response = 'perguntas geradas';

    const result = await useCase.execute({
      userId: 'user-1',
      skill: 'study.questions',
      context: { title: 'A ressurreição' },
    });

    expect(result.text).toBe('perguntas geradas');
    expect(runner.lastPrompt?.skill).toBe('study.questions');
    // o conteúdo do usuário foi interpolado no prompt enviado ao runner
    expect(runner.lastPrompt?.user).toContain('A ressurreição');
    // a moldura do §9 acompanha o system de toda skill
    expect(runner.lastPrompt?.system).toContain('espelho');
  });

  it('defaults to pt and honours the locale when given', async () => {
    await useCase.execute({
      userId: 'user-1',
      skill: 'study.quiz',
      context: { title: 'X' },
    });
    expect(runner.lastPrompt?.user).toContain('Tópico');

    await useCase.execute({
      userId: 'user-1',
      skill: 'study.quiz',
      context: { title: 'X' },
      locale: 'en',
    });
    expect(runner.lastPrompt?.user).toContain('Topic');
  });

  it('builds publish.draft prompts with the format and source text', async () => {
    await useCase.execute({
      userId: 'user-1',
      skill: 'publish.draft',
      context: { format: 'blog', sourceText: 'meu material de estudo' },
    });
    expect(runner.lastPrompt?.skill).toBe('publish.draft');
    expect(runner.lastPrompt?.user).toContain('meu material de estudo');
  });

  it('propagates a runner error (e.g. provider failure) to the caller', async () => {
    runner.error = new Error('provider down');
    await expect(
      useCase.execute({
        userId: 'user-1',
        skill: 'study.questions',
        context: { title: 'X' },
      }),
    ).rejects.toThrow('provider down');
  });
});
