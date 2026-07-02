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

  'study.explain': (ctx) => ({
    system: withRole(
      'Current task: explain a SPECIFIC excerpt and define its difficult terms — anchored to the excerpt, never summarizing the whole material (the user reads the source; you only unblock comprehension).',
    ),
    user: joinLines([
      ctx.resourceTitle && `Source: ${ctx.resourceTitle}`,
      'Excerpt to explain:',
      '---',
      ctx.excerpt,
      '---',
      'Explain what this excerpt is saying: (1) define technical or unusual terms; (2) restate the core idea in other words; (3) point out what the author is assuming or responding to.',
      ctx.level === 'eli5' &&
        'Use simple language, as if for a smart 12-year-old — no jargon.',
      'Do not summarize the whole material or go beyond the excerpt: the goal is to unblock the reading, not replace it.',
    ]),
  }),

  'study.socratic': (ctx) => ({
    system: withRole(
      'Current task: act as a Socratic tutor over a from-memory summary — ask ONLY questions that deepen understanding, never give answers.',
    ),
    user: joinLines([
      `Topic studied: "${ctx.title}"`,
      '',
      "User's from-memory summary:",
      '---',
      ctx.fichamentoText,
      '---',
      'Reply with QUESTIONS ONLY — no statements, answers or corrections.',
      '5 to 8 questions, in increasing depth: start by checking basic understanding, move to implications, and end with questions that expose tensions or gaps in the summary itself.',
      'Questions specific to THIS summary — nothing generic.',
    ]),
  }),

  'study.difference_map': (ctx) => ({
    system: withRole(
      'Current task: build a DIFFERENCE map between authors on the same topic — discriminate where they truly agree, where it is only vocabulary, and where the divergence is real (retentive-reading practices 4/5/9).',
    ),
    user: joinLines([
      `Topic: "${ctx.topic}"`,
      '',
      'What the user studied from each author:',
      ...ctx.sources.flatMap((s) => [
        `### ${s.resourceTitle}${s.author ? ` — ${s.author}` : ''}`,
        '---',
        s.fichamentoText,
        '---',
      ]),
      'Build the difference map:',
      '1. Where the authors TRULY AGREE;',
      '2. Where the divergence is VOCABULARY ONLY (same idea, different terms);',
      '3. Where there is REAL divergence of thesis — and what exactly the disagreement is;',
      '4. For each author: the distinctive thesis, the key passage supporting it, the weakest point of the argument, and what sets them apart.',
      'Use ONLY what is in the summaries above; where evidence is missing, say what the user would need to reread to decide.',
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
