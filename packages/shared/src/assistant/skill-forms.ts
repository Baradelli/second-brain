import type { AiRunRequest } from '../ai.js';
import type {
  AiSkillKey,
  DifferenceMapContext,
  ExplainContext,
  FichamentoFeedbackContext,
  PromptContext,
  PromptLocale,
  PublishDraftContext,
  QuizContext,
  SocraticContext,
  StudyQuestionsContext,
} from '../prompt/types.js';
import type { PublicationFormatInput } from '../publication.js';

/**
 * Lógica pura dos formulários de skill do Assistente (IA) — COMPARTILHADA entre
 * web (AssistantTab) e mobile (AssistantPage, Tarefas 80/82). Sem React aqui —
 * só funções testáveis. NÃO reescreve prompts: a construção vive em `buildPrompt`.
 * Aqui só decidimos QUAIS campos cada skill coleta, se estão preenchidos, e como
 * mapear os campos brutos do formulário para o `PromptContext`/`AiRunRequest`.
 *
 * Regra de produto (§9): tudo que a IA devolve é CANDIDATO. Este módulo só
 * prepara a entrada; a confirmação/gravação é responsabilidade da tela, sempre
 * após o usuário revisar.
 */

/** Campos brutos do formulário do Assistente (todos string; vazios são ignorados). */
export interface AssistantFormValues {
  title?: string;
  reference?: string;
  resourceTitle?: string;
  author?: string;
  fichamentoText?: string;
  sourceHint?: string;
  topics?: string;
  format?: PublicationFormatInput;
  sourceText?: string;
  angle?: string;
  // study.explain (Tarefa 79)
  excerpt?: string;
  level?: 'eli5' | 'technical';
  // study.difference_map — o hub compara DUAS fontes (v1); a tela de estudo
  // (Tarefa 90) alimenta a skill com N fontes reais sem passar por aqui.
  topic?: string;
  sourceATitle?: string;
  sourceAAuthor?: string;
  sourceAText?: string;
  sourceBTitle?: string;
  sourceBAuthor?: string;
  sourceBText?: string;
}

/** Um campo do formulário e se é obrigatório para a skill. */
export interface SkillField {
  /** Nome da propriedade em AssistantFormValues. */
  name: keyof AssistantFormValues;
  /** Obrigatório para montar o contexto desta skill. */
  required: boolean;
  /** Renderiza como textarea (multilinha) em vez de input simples. */
  multiline?: boolean;
  /** É um seletor de formato de publicação (linkedin/substack/…). */
  format?: boolean;
}

/** Descritor de uma skill: a chave + os campos que ela coleta. */
export interface SkillDescriptor {
  skill: AiSkillKey;
  fields: SkillField[];
}

/**
 * As 7 skills e os campos que cada uma coleta — espelha exatamente os contextos
 * de `prompt/types.ts`.
 */
export const ASSISTANT_SKILLS: readonly SkillDescriptor[] = [
  {
    skill: 'study.questions',
    fields: [
      { name: 'title', required: true },
      { name: 'reference', required: false },
      { name: 'resourceTitle', required: false },
      { name: 'author', required: false },
    ],
  },
  {
    skill: 'study.fichamento_feedback',
    fields: [
      { name: 'title', required: true },
      { name: 'fichamentoText', required: true, multiline: true },
      { name: 'sourceHint', required: false, multiline: true },
    ],
  },
  {
    skill: 'study.quiz',
    fields: [
      { name: 'title', required: true },
      { name: 'topics', required: false, multiline: true },
    ],
  },
  {
    skill: 'study.explain',
    fields: [
      { name: 'excerpt', required: true, multiline: true },
      { name: 'resourceTitle', required: false },
    ],
  },
  {
    skill: 'study.socratic',
    fields: [
      { name: 'title', required: true },
      { name: 'fichamentoText', required: true, multiline: true },
    ],
  },
  {
    skill: 'study.difference_map',
    fields: [
      { name: 'topic', required: true },
      { name: 'sourceATitle', required: true },
      { name: 'sourceAAuthor', required: false },
      { name: 'sourceAText', required: true, multiline: true },
      { name: 'sourceBTitle', required: true },
      { name: 'sourceBAuthor', required: false },
      { name: 'sourceBText', required: true, multiline: true },
    ],
  },
  {
    skill: 'publish.draft',
    fields: [
      { name: 'format', required: true, format: true },
      { name: 'sourceText', required: true, multiline: true },
      { name: 'angle', required: false },
    ],
  },
] as const;

/** Acha o descritor de uma skill (ou undefined se desconhecida). */
export function skillDescriptor(
  skill: AiSkillKey,
): SkillDescriptor | undefined {
  return ASSISTANT_SKILLS.find((s) => s.skill === skill);
}

/** Trim seguro: undefined/espacos → string vazia. */
function clean(value?: string): string {
  return (value ?? '').trim();
}

/**
 * Os campos obrigatórios da skill estão todos preenchidos? Decide se o botão de
 * gerar/copiar prompt fica habilitado (sem isso, não há contexto válido).
 */
export function requiredFieldsFilled(
  skill: AiSkillKey,
  values: AssistantFormValues,
): boolean {
  const descriptor = skillDescriptor(skill);
  if (!descriptor) return false;
  return descriptor.fields
    .filter((f) => f.required)
    .every((f) => clean(values[f.name] as string | undefined).length > 0);
}

/** Cada linha não-vazia do textarea vira um tópico (mesma regra do mobile). */
function toLines(value?: string): string[] {
  return clean(value)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Mapeia os campos brutos do formulário para o `PromptContext` da skill —
 * trimando e descartando opcionais vazios (igual ao que o mobile passa). É a
 * mesma forma usada tanto no modo cheap (`buildPrompt`) quanto no conectado
 * (corpo de `runAi`). Lança se faltar obrigatório (a tela só chama quando
 * `requiredFieldsFilled` é true).
 */
export function buildContext(
  skill: AiSkillKey,
  values: AssistantFormValues,
): PromptContext {
  if (!requiredFieldsFilled(skill, values)) {
    throw new Error(`Missing required fields for skill: ${skill}`);
  }
  switch (skill) {
    case 'study.questions': {
      const ctx: StudyQuestionsContext = { title: clean(values.title) };
      const reference = clean(values.reference);
      const resourceTitle = clean(values.resourceTitle);
      const author = clean(values.author);
      if (reference) ctx.reference = reference;
      if (resourceTitle) ctx.resourceTitle = resourceTitle;
      if (author) ctx.author = author;
      return ctx;
    }
    case 'study.fichamento_feedback': {
      const ctx: FichamentoFeedbackContext = {
        title: clean(values.title),
        fichamentoText: clean(values.fichamentoText),
      };
      const sourceHint = clean(values.sourceHint);
      if (sourceHint) ctx.sourceHint = sourceHint;
      return ctx;
    }
    case 'study.quiz': {
      const ctx: QuizContext = { title: clean(values.title) };
      const topics = toLines(values.topics);
      if (topics.length > 0) ctx.topics = topics;
      return ctx;
    }
    case 'study.explain': {
      const ctx: ExplainContext = { excerpt: clean(values.excerpt) };
      const resourceTitle = clean(values.resourceTitle);
      if (resourceTitle) ctx.resourceTitle = resourceTitle;
      if (values.level) ctx.level = values.level;
      return ctx;
    }
    case 'study.socratic': {
      const ctx: SocraticContext = {
        title: clean(values.title),
        fichamentoText: clean(values.fichamentoText),
      };
      return ctx;
    }
    case 'study.difference_map': {
      const sourceA = {
        resourceTitle: clean(values.sourceATitle),
        fichamentoText: clean(values.sourceAText),
        ...(clean(values.sourceAAuthor)
          ? { author: clean(values.sourceAAuthor) }
          : {}),
      };
      const sourceB = {
        resourceTitle: clean(values.sourceBTitle),
        fichamentoText: clean(values.sourceBText),
        ...(clean(values.sourceBAuthor)
          ? { author: clean(values.sourceBAuthor) }
          : {}),
      };
      const ctx: DifferenceMapContext = {
        topic: clean(values.topic),
        sources: [sourceA, sourceB],
      };
      return ctx;
    }
    case 'publish.draft': {
      // O formato é obrigatório; requiredFieldsFilled já garantiu que veio.
      const ctx: PublishDraftContext = {
        format: values.format as PublicationFormatInput,
        sourceText: clean(values.sourceText),
      };
      const angle = clean(values.angle);
      if (angle) ctx.angle = angle;
      return ctx;
    }
    default:
      throw new Error(`Unknown AI skill: ${skill as string}`);
  }
}

/**
 * Monta o corpo de `runAi` (modo conectado) a partir da skill + campos do
 * formulário. É o MESMO contexto do modo cheap (`buildContext`), só embrulhado na
 * união discriminada por `skill` que a borda do backend valida. Não inventa
 * prompt nenhum — o servidor reusa `buildPrompt`. Lança se faltar obrigatório.
 */
export function aiRunBody(
  skill: AiSkillKey,
  values: AssistantFormValues,
  locale: PromptLocale,
): AiRunRequest {
  const context = buildContext(skill, values);
  // O `buildContext` já casa o contexto com a skill; aqui só montamos a união.
  // O cast é seguro porque cada ramo de `buildContext` devolve o contexto certo.
  switch (skill) {
    case 'study.questions':
      return {
        skill,
        context: context as StudyQuestionsContext,
        locale,
      };
    case 'study.fichamento_feedback':
      return {
        skill,
        context: context as FichamentoFeedbackContext,
        locale,
      };
    case 'study.quiz':
      return { skill, context: context as QuizContext, locale };
    case 'study.explain':
      return { skill, context: context as ExplainContext, locale };
    case 'study.socratic':
      return { skill, context: context as SocraticContext, locale };
    case 'study.difference_map':
      return { skill, context: context as DifferenceMapContext, locale };
    case 'publish.draft':
      return {
        skill,
        context: context as PublishDraftContext,
        locale,
      };
    default:
      throw new Error(`Unknown AI skill: ${skill as string}`);
  }
}

/**
 * Título da NOTE candidata gerada a partir do resultado da IA. Espelha o
 * `saveAsNote(itemTitle, suffix)` do mobile: "<assunto> — <nome da skill>". O
 * `subject` é o título digitado (ou o formato, para rascunho); o `skillLabel` é
 * o texto traduzido da skill (`ai.skill.*`). Sem assunto, usa só o rótulo.
 */
export function candidateNoteTitle(
  values: AssistantFormValues,
  skillLabel: string,
): string {
  const subject = clean(values.title) || clean(values.topic);
  return subject ? `${subject} — ${skillLabel}` : skillLabel;
}
