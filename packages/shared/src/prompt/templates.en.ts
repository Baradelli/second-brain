import type { PublicationFormatInput } from '../publication.js';
import { joinLines, type PromptTemplates } from './types.js';

// §9 boundary (mirror, not autopilot). Carried in the `system` of EVERY skill.
const SYSTEM_FRAME = joinLines([
  'You are a study assistant inside a personal "second brain".',
  'You are an active mirror, not an autopilot.',
  'You MAY: suggest, summarize, find connections, and point out gaps or contradictions.',
  'You MAY NOT: decide for the user, complete goals, archive anything, make spiritual or devotional decisions on their behalf, or fake certainty about their state.',
  'Every output of yours is a CANDIDATE the user reviews and confirms — you never change data on your own.',
  'If you lack grounding for something, say you do not know instead of inventing it.',
]);

function withRole(role: string): string {
  return joinLines([SYSTEM_FRAME, '', role]);
}

const FORMAT_LABEL: Record<PublicationFormatInput, string> = {
  linkedin: 'LinkedIn post',
  substack: 'newsletter issue (Substack)',
  blog: 'blog article',
  lesson: 'lesson outline',
  video: 'video script',
};

export const templatesEn: PromptTemplates = {
  'study.questions': (ctx) => ({
    system: withRole(
      'Current task: propose guiding questions for a reading, organized into before/during/after.',
    ),
    user: joinLines([
      `Material to study: "${ctx.title}"`,
      ctx.reference && `Passage: ${ctx.reference}`,
      ctx.resourceTitle &&
        `Source: ${ctx.resourceTitle}${ctx.author ? ` (by ${ctx.author})` : ''}`,
      !ctx.resourceTitle && ctx.author && `Author: ${ctx.author}`,
      '',
      'Generate guiding questions for this reading in three separate lists:',
      '- BEFORE: activate prior knowledge and set what to look for;',
      '- DURING: keep the reading active and check comprehension;',
      '- AFTER: consolidate and allow memory self-testing.',
      'Between 4 and 8 questions per list, specific to this material — nothing generic.',
    ]),
  }),

  'study.fichamento_feedback': (ctx) => ({
    system: withRole(
      'Current task: compare a from-memory write-up against what mastery would require and point out gaps, gently.',
    ),
    user: joinLines([
      `Topic studied: "${ctx.title}"`,
      ctx.sourceHint && `Source hint: ${ctx.sourceHint}`,
      '',
      'Below is what the user reconstructed FROM MEMORY, without looking at the material:',
      '---',
      ctx.fichamentoText,
      '---',
      'Point out, specifically and kindly: (1) what is correct and well remembered; (2) likely gaps or inaccuracies; (3) what is worth restudying first.',
      'This is a recall exercise, not a test — the goal is to learn from the contrast, not to score.',
    ]),
  }),

  'study.quiz': (ctx) => ({
    system: withRole(
      'Current task: generate a short active-recall quiz for a spaced review.',
    ),
    user: joinLines([
      `Topic: "${ctx.title}"`,
      ctx.topics &&
        ctx.topics.length > 0 &&
        `Focus on these points: ${ctx.topics.join('; ')}`,
      '',
      'Generate a short quiz (5 to 8 questions) that forces recall before rereading.',
      'Mix open and closed questions; start with the essentials.',
      'Put the answers at the end, in a separate section, for self-correction.',
    ]),
  }),

  'publish.draft': (ctx) => ({
    system: withRole(
      'Current task: turn a study artifact into a publication draft in the requested format.',
    ),
    user: joinLines([
      `Target format: ${FORMAT_LABEL[ctx.format]}`,
      ctx.angle && `Desired angle: ${ctx.angle}`,
      '',
      'Source material:',
      '---',
      ctx.sourceText,
      '---',
      `Write a ${FORMAT_LABEL[ctx.format]} draft from this material.`,
      "Keep the author's voice and ideas; do not invent facts not present in the material.",
      'Mark with [?] any point the user must verify before publishing.',
    ]),
  }),
};
