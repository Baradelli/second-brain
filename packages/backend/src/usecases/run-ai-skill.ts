import {
  buildPrompt,
  type DifferenceMapContext,
  type ExplainContext,
  type FichamentoFeedbackContext,
  type PromptLocale,
  type PublishDraftContext,
  type QuizContext,
  type SocraticContext,
  type StudyQuestionsContext,
} from '@cerebro/shared';

import type { AiRunner } from './ports/ai-runner.js';

// Pedido discriminado por skill — cada skill exige o seu contexto (validado na borda).
export type RunAiSkillInput =
  | {
      userId: string;
      skill: 'study.questions';
      context: StudyQuestionsContext;
      locale?: PromptLocale;
    }
  | {
      userId: string;
      skill: 'study.fichamento_feedback';
      context: FichamentoFeedbackContext;
      locale?: PromptLocale;
    }
  | {
      userId: string;
      skill: 'study.quiz';
      context: QuizContext;
      locale?: PromptLocale;
    }
  | {
      userId: string;
      skill: 'study.explain';
      context: ExplainContext;
      locale?: PromptLocale;
    }
  | {
      userId: string;
      skill: 'study.socratic';
      context: SocraticContext;
      locale?: PromptLocale;
    }
  | {
      userId: string;
      skill: 'study.difference_map';
      context: DifferenceMapContext;
      locale?: PromptLocale;
    }
  | {
      userId: string;
      skill: 'publish.draft';
      context: PublishDraftContext;
      locale?: PromptLocale;
    };

// Roda buildPrompt (shared) e delega ao AiRunner injetado. Não persiste nada — o texto
// volta como candidato para o usuário confirmar (§9: nunca altera dado sem confirmação).
export class RunAiSkill {
  constructor(private runner: AiRunner) {}

  async execute(input: RunAiSkillInput): Promise<{ text: string }> {
    const locale = input.locale ?? 'pt';
    const prompt = (() => {
      switch (input.skill) {
        case 'study.questions':
          return buildPrompt(input.skill, input.context, locale);
        case 'study.fichamento_feedback':
          return buildPrompt(input.skill, input.context, locale);
        case 'study.quiz':
          return buildPrompt(input.skill, input.context, locale);
        case 'study.explain':
          return buildPrompt(input.skill, input.context, locale);
        case 'study.socratic':
          return buildPrompt(input.skill, input.context, locale);
        case 'study.difference_map':
          return buildPrompt(input.skill, input.context, locale);
        case 'publish.draft':
          return buildPrompt(input.skill, input.context, locale);
      }
    })();

    return this.runner.run(prompt);
  }
}
