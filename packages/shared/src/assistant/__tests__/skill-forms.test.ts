import { describe, expect, it } from 'vitest';

import {
  aiRunBody,
  ASSISTANT_SKILLS,
  type AssistantFormValues,
  buildContext,
  candidateNoteTitle,
  requiredFieldsFilled,
  skillDescriptor,
} from '../skill-forms.js';

describe('ASSISTANT_SKILLS', () => {
  it('cobre exatamente as 7 skills, na ordem do hub', () => {
    expect(ASSISTANT_SKILLS.map((s) => s.skill)).toEqual([
      'study.questions',
      'study.fichamento_feedback',
      'study.quiz',
      'study.explain',
      'study.socratic',
      'study.difference_map',
      'publish.draft',
    ]);
  });

  it('marca os campos obrigatórios que espelham o contexto de cada skill', () => {
    const required = (skill: Parameters<typeof skillDescriptor>[0]) =>
      skillDescriptor(skill)
        ?.fields.filter((f) => f.required)
        .map((f) => f.name);
    expect(required('study.questions')).toEqual(['title']);
    expect(required('study.fichamento_feedback')).toEqual([
      'title',
      'fichamentoText',
    ]);
    expect(required('study.quiz')).toEqual(['title']);
    expect(required('publish.draft')).toEqual(['format', 'sourceText']);
  });
});

describe('requiredFieldsFilled', () => {
  it('é falso quando falta um obrigatório (título em branco não conta)', () => {
    expect(requiredFieldsFilled('study.questions', { title: '   ' })).toBe(
      false,
    );
    expect(
      requiredFieldsFilled('study.fichamento_feedback', { title: 'X' }),
    ).toBe(false);
    expect(requiredFieldsFilled('publish.draft', { sourceText: 'oi' })).toBe(
      false,
    );
  });

  it('é verdadeiro quando todos os obrigatórios estão preenchidos', () => {
    expect(requiredFieldsFilled('study.questions', { title: 'Hábito' })).toBe(
      true,
    );
    expect(
      requiredFieldsFilled('study.fichamento_feedback', {
        title: 'Hábito',
        fichamentoText: 'meu resumo',
      }),
    ).toBe(true);
    expect(
      requiredFieldsFilled('publish.draft', {
        format: 'linkedin',
        sourceText: 'fonte',
      }),
    ).toBe(true);
  });
});

describe('buildContext', () => {
  it('descarta opcionais vazios e trima (study.questions)', () => {
    const ctx = buildContext('study.questions', {
      title: '  Hábitos  ',
      reference: '',
      author: '  James Clear ',
    });
    expect(ctx).toEqual({ title: 'Hábitos', author: 'James Clear' });
  });

  it('quebra os tópicos do quiz por linha, ignorando vazias', () => {
    const ctx = buildContext('study.quiz', {
      title: 'Hábitos',
      topics: 'a\n\n  b  \n',
    });
    expect(ctx).toEqual({ title: 'Hábitos', topics: ['a', 'b'] });
  });

  it('mantém o formato e o angle opcional (publish.draft)', () => {
    const ctx = buildContext('publish.draft', {
      format: 'substack',
      sourceText: 'rascunho',
      angle: 'memória',
    });
    expect(ctx).toEqual({
      format: 'substack',
      sourceText: 'rascunho',
      angle: 'memória',
    });
  });

  it('lança quando falta obrigatório', () => {
    expect(() => buildContext('study.quiz', {})).toThrow();
  });
});

describe('aiRunBody', () => {
  it('embrulha o contexto na união discriminada por skill + locale', () => {
    const body = aiRunBody(
      'study.fichamento_feedback',
      { title: 'Hábitos', fichamentoText: 'meu resumo' },
      'pt',
    );
    expect(body).toEqual({
      skill: 'study.fichamento_feedback',
      context: { title: 'Hábitos', fichamentoText: 'meu resumo' },
      locale: 'pt',
    });
  });

  it('passa o locale en adiante', () => {
    const body = aiRunBody(
      'publish.draft',
      { format: 'blog', sourceText: 'fonte' },
      'en',
    );
    expect(body).toMatchObject({ skill: 'publish.draft', locale: 'en' });
  });

  it('lança quando falta obrigatório (não há contexto válido)', () => {
    const empty: AssistantFormValues = {};
    expect(() => aiRunBody('study.questions', empty, 'pt')).toThrow();
  });
});

describe('candidateNoteTitle', () => {
  it('combina assunto e rótulo da skill', () => {
    expect(
      candidateNoteTitle({ title: 'Hábitos' }, 'Gerar quiz de revisão'),
    ).toBe('Hábitos — Gerar quiz de revisão');
  });

  it('usa só o rótulo quando não há assunto', () => {
    expect(candidateNoteTitle({}, 'Rascunhar com IA')).toBe('Rascunhar com IA');
  });
});

// ── Skills novas (Tarefa 79/80) ──────────────────────────────────────────────

describe('skills novas no hub', () => {
  it('study.explain exige excerpt e monta o contexto', () => {
    expect(requiredFieldsFilled('study.explain', {})).toBe(false);
    expect(requiredFieldsFilled('study.explain', { excerpt: 'x' })).toBe(true);
    expect(
      buildContext('study.explain', { excerpt: ' t ', resourceTitle: 'R' }),
    ).toEqual({ excerpt: 't', resourceTitle: 'R' });
  });

  it('study.socratic exige title + fichamentoText', () => {
    expect(
      requiredFieldsFilled('study.socratic', { title: 'T' }),
    ).toBe(false);
    expect(
      buildContext('study.socratic', { title: 'T', fichamentoText: 'f' }),
    ).toEqual({ title: 'T', fichamentoText: 'f' });
  });

  it('study.difference_map monta DUAS fontes a partir dos campos A/B', () => {
    const values = {
      topic: 'ressurreicao',
      sourceATitle: 'A',
      sourceAAuthor: 'Wright',
      sourceAText: 'a',
      sourceBTitle: 'B',
      sourceBText: 'b',
    };
    expect(requiredFieldsFilled('study.difference_map', values)).toBe(true);
    expect(buildContext('study.difference_map', values)).toEqual({
      topic: 'ressurreicao',
      sources: [
        { resourceTitle: 'A', author: 'Wright', fichamentoText: 'a' },
        { resourceTitle: 'B', fichamentoText: 'b' },
      ],
    });
    const body = aiRunBody('study.difference_map', values, 'pt');
    expect(body.skill).toBe('study.difference_map');
  });
});
