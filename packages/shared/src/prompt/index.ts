import { templatesEn } from './templates.en.js';
import { templatesPt } from './templates.pt.js';
import {
  type AiSkillKey,
  type BuiltPrompt,
  type DifferenceMapContext,
  type ExplainContext,
  type FichamentoFeedbackContext,
  type PromptContext,
  type PromptLocale,
  type PromptTemplates,
  type PublishDraftContext,
  type QuizContext,
  type SocraticContext,
  type StudyQuestionsContext,
  UnknownAiSkillError,
} from './types.js';

export * from './types.js';

const TEMPLATES: Record<PromptLocale, PromptTemplates> = {
  pt: templatesPt,
  en: templatesEn,
};

// buildPrompt(skill, context, locale?) — puro e determinístico (sem relógio/aleatório).
// Overloads dão segurança de tipo: cada skill exige o seu contexto.
export function buildPrompt(
  skill: 'study.questions',
  context: StudyQuestionsContext,
  locale?: PromptLocale,
): BuiltPrompt;
export function buildPrompt(
  skill: 'study.fichamento_feedback',
  context: FichamentoFeedbackContext,
  locale?: PromptLocale,
): BuiltPrompt;
export function buildPrompt(
  skill: 'study.quiz',
  context: QuizContext,
  locale?: PromptLocale,
): BuiltPrompt;
export function buildPrompt(
  skill: 'study.explain',
  context: ExplainContext,
  locale?: PromptLocale,
): BuiltPrompt;
export function buildPrompt(
  skill: 'study.socratic',
  context: SocraticContext,
  locale?: PromptLocale,
): BuiltPrompt;
export function buildPrompt(
  skill: 'study.difference_map',
  context: DifferenceMapContext,
  locale?: PromptLocale,
): BuiltPrompt;
export function buildPrompt(
  skill: 'publish.draft',
  context: PublishDraftContext,
  locale?: PromptLocale,
): BuiltPrompt;
export function buildPrompt(
  skill: AiSkillKey,
  context: PromptContext,
  locale: PromptLocale = 'pt',
): BuiltPrompt {
  const templates = TEMPLATES[locale] ?? TEMPLATES.pt;
  const template = templates[skill];
  if (!template) {
    throw new UnknownAiSkillError(skill);
  }
  // O overload garante a correspondência skill↔contexto na borda; aqui resolvemos
  // o tipo da união para o template escolhido.
  const body = (
    template as (ctx: PromptContext) => { system: string; user: string }
  )(context);
  return { skill, system: body.system, user: body.user };
}
