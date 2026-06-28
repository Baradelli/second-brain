/**
 * Extração pura do outline (lista de títulos) de um doc TipTap/ProseMirror.
 *
 * Sem React nem DOM aqui — recebe o JSON do `doc` e devolve os headings em
 * ordem de documento, com nível, texto e um id estável. O id combina a posição
 * (índice entre os headings) com um slug do texto, então é único mesmo quando
 * dois títulos têm o mesmo texto e estável entre chamadas com o mesmo doc.
 *
 * O painel direito usa o índice (a ordem) para rolar até o N-ésimo heading
 * renderizado no editor — por isso a ordem aqui precisa casar com a do DOM.
 */

export interface OutlineHeading {
  /** Id estável/único, usável como âncora. */
  id: string;
  /** Nível do título (1 ou 2 no nosso editor). */
  level: number;
  /** Texto plano concatenado do título. */
  text: string;
  /** Posição entre os headings (0-based), para localizar no DOM do editor. */
  index: number;
}

interface ProseMirrorNode {
  type?: string;
  text?: string;
  attrs?: { level?: number } & Record<string, unknown>;
  content?: ProseMirrorNode[];
}

/** Concatena recursivamente o texto de um nó (e seus filhos). */
function textOf(node: ProseMirrorNode): string {
  if (typeof node.text === 'string') return node.text;
  if (!Array.isArray(node.content)) return '';
  return node.content.map(textOf).join('');
}

/** Slug simples para compor o id (minúsculo, sem acento, hífens). */
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractOutline(
  doc: Record<string, unknown> | undefined,
): OutlineHeading[] {
  const root = doc as ProseMirrorNode | undefined;
  const content = root?.content;
  if (!Array.isArray(content)) return [];

  const headings: OutlineHeading[] = [];
  for (const node of content) {
    if (node?.type !== 'heading') continue;
    const text = textOf(node).trim();
    if (!text) continue;
    const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1;
    const index = headings.length;
    headings.push({
      id: `h-${index}-${slugify(text) || 'heading'}`,
      level,
      text,
      index,
    });
  }
  return headings;
}
