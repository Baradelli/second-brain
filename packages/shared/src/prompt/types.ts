import type { PublicationFormatInput } from '../publication.js';

export type AiSkillKey =
  | 'study.questions' // perguntas antes/durante/depois (Prática 2)
  | 'study.fichamento_feedback' // comparar fichamento × material, apontar lacunas (1/6)
  | 'study.quiz' // quiz de recuperação ativa (3/7)
  | 'publish.draft'; // rascunho de post/artigo/roteiro por formato (Bloco O)

export const AI_SKILL_KEYS: readonly AiSkillKey[] = [
  'study.questions',
  'study.fichamento_feedback',
  'study.quiz',
  'publish.draft',
];

export type PromptLocale = 'pt' | 'en';

export interface BuiltPrompt {
  skill: AiSkillKey;
  system: string; // papel/limites (carrega a moldura do §9: sugere, não decide)
  user: string; // o pedido com o contexto do usuário interpolado
}

// Corpo de um template: o que cada função de template devolve (sem o `skill`).
export interface PromptBody {
  system: string;
  user: string;
}

// ── Contextos por skill ───────────────────────────────────────────────────────

export interface StudyQuestionsContext {
  title: string;
  reference?: string;
  resourceTitle?: string;
  author?: string;
}

export interface FichamentoFeedbackContext {
  title: string;
  fichamentoText: string;
  sourceHint?: string;
}

export interface QuizContext {
  title: string;
  topics?: string[];
}

export interface PublishDraftContext {
  format: PublicationFormatInput;
  sourceText: string;
  angle?: string;
}

// União por skill (cada implementação de template recebe o seu contexto).
export type PromptContext =
  | StudyQuestionsContext
  | FichamentoFeedbackContext
  | QuizContext
  | PublishDraftContext;

export interface PromptTemplates {
  'study.questions': (ctx: StudyQuestionsContext) => PromptBody;
  'study.fichamento_feedback': (ctx: FichamentoFeedbackContext) => PromptBody;
  'study.quiz': (ctx: QuizContext) => PromptBody;
  'publish.draft': (ctx: PublishDraftContext) => PromptBody;
}

export class UnknownAiSkillError extends Error {
  constructor(skill: string) {
    super(`Unknown AI skill: ${skill}`);
    this.name = 'UnknownAiSkillError';
  }
}

// Junta linhas ignorando as vazias/ausentes — campos opcionais somem sem quebrar.
export function joinLines(
  lines: (string | false | null | undefined)[],
): string {
  return lines.filter((l): l is string => Boolean(l)).join('\n');
}
