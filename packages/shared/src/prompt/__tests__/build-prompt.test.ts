import { describe, expect, it } from 'vitest';

import { buildPrompt } from '../index.js';
import { AI_SKILL_KEYS, UnknownAiSkillError } from '../types.js';

describe('buildPrompt — study.questions', () => {
  it('interpolates the title into the user prompt', () => {
    const p = buildPrompt('study.questions', { title: 'A Ressurreição' });
    expect(p.skill).toBe('study.questions');
    expect(p.user).toContain('A Ressurreição');
    expect(p.user).toContain('ANTES');
    expect(p.user).toContain('DURANTE');
    expect(p.user).toContain('DEPOIS');
  });

  it('includes optional reference / source / author when present', () => {
    const p = buildPrompt('study.questions', {
      title: 'Cap. 3',
      reference: 'pp. 40–60',
      resourceTitle: 'A Ressurreição do Filho de Deus',
      author: 'N. T. Wright',
    });
    expect(p.user).toContain('pp. 40–60');
    expect(p.user).toContain('A Ressurreição do Filho de Deus');
    expect(p.user).toContain('N. T. Wright');
  });

  it('omits optional lines when absent (no leftover labels)', () => {
    const p = buildPrompt('study.questions', { title: 'Só o título' });
    expect(p.user).not.toContain('Trecho:');
    expect(p.user).not.toContain('Fonte:');
    expect(p.user).not.toContain('Autor:');
    expect(p.user).not.toContain('undefined');
  });

  it('falls back to Autor line when there is an author but no resourceTitle', () => {
    const p = buildPrompt('study.questions', {
      title: 'X',
      author: 'Alguém',
    });
    expect(p.user).toContain('Autor: Alguém');
    expect(p.user).not.toContain('Fonte:');
  });
});

describe('buildPrompt — study.fichamento_feedback', () => {
  it('embeds the from-memory text and an optional source hint', () => {
    const p = buildPrompt('study.fichamento_feedback', {
      title: 'Memória episódica',
      fichamentoText: 'Lembro que havia três sistemas...',
      sourceHint: 'Kahana & Wagner',
    });
    expect(p.user).toContain('Lembro que havia três sistemas...');
    expect(p.user).toContain('Kahana & Wagner');
  });

  it('omits the source hint line when absent', () => {
    const p = buildPrompt('study.fichamento_feedback', {
      title: 'X',
      fichamentoText: 'texto',
    });
    expect(p.user).not.toContain('Pista da fonte:');
    expect(p.user).not.toContain('undefined');
  });
});

describe('buildPrompt — study.quiz', () => {
  it('joins topics when provided', () => {
    const p = buildPrompt('study.quiz', {
      title: 'Curva de esquecimento',
      topics: ['Ebbinghaus', 'espaçamento', 'recuperação'],
    });
    expect(p.user).toContain('Ebbinghaus; espaçamento; recuperação');
  });

  it('omits the focus line for an empty or absent topics list', () => {
    const empty = buildPrompt('study.quiz', { title: 'X', topics: [] });
    const absent = buildPrompt('study.quiz', { title: 'X' });
    expect(empty.user).not.toContain('Focar nestes pontos:');
    expect(absent.user).not.toContain('Focar nestes pontos:');
  });
});

describe('buildPrompt — publish.draft', () => {
  it('interpolates the source text and a human format label', () => {
    const p = buildPrompt('publish.draft', {
      format: 'linkedin',
      sourceText: 'Resumo do que aprendi sobre memória.',
      angle: 'para iniciantes',
    });
    expect(p.user).toContain('Resumo do que aprendi sobre memória.');
    expect(p.user).toContain('post de LinkedIn');
    expect(p.user).toContain('para iniciantes');
  });

  it('omits the angle line when absent', () => {
    const p = buildPrompt('publish.draft', {
      format: 'blog',
      sourceText: 'texto',
    });
    expect(p.user).not.toContain('Ângulo desejado:');
  });
});

describe('buildPrompt — locale', () => {
  it('defaults to pt', () => {
    const p = buildPrompt('study.questions', { title: 'X' });
    expect(p.user).toContain('Material a estudar');
  });

  it('selects en when asked', () => {
    const p = buildPrompt('study.questions', { title: 'X' }, 'en');
    expect(p.user).toContain('Material to study');
    expect(p.system).toContain('active mirror');
  });
});

describe('buildPrompt — §9 boundary in system', () => {
  for (const skill of AI_SKILL_KEYS) {
    it(`carries the agent limits in the system prompt (${skill}, pt)`, () => {
      // contexto mínimo válido por skill
      const ctxBySkill: Record<string, unknown> = {
        'study.questions': { title: 'X' },
        'study.fichamento_feedback': { title: 'X', fichamentoText: 'y' },
        'study.quiz': { title: 'X' },
        'publish.draft': { format: 'blog', sourceText: 'y' },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = buildPrompt(skill as any, ctxBySkill[skill] as any);
      expect(p.system).toContain('espelho');
      expect(p.system).toContain('NÃO PODE');
      expect(p.system).toContain('CANDIDATO');
      expect(p.system.toLowerCase()).toContain('confirma');
    });
  }

  it('also carries the boundary in en', () => {
    const p = buildPrompt('study.quiz', { title: 'X' }, 'en');
    expect(p.system).toContain('active mirror');
    expect(p.system).toContain('MAY NOT');
    expect(p.system).toContain('CANDIDATE');
  });
});

describe('buildPrompt — unknown skill', () => {
  it('throws UnknownAiSkillError', () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      buildPrompt('study.unknown' as any, { title: 'X' } as any),
    ).toThrow(UnknownAiSkillError);
  });
});

describe('buildPrompt — determinism', () => {
  it('same input → same output', () => {
    const ctx = { title: 'Determinismo', reference: 'p. 1' };
    expect(buildPrompt('study.questions', ctx)).toEqual(
      buildPrompt('study.questions', ctx),
    );
  });
});
