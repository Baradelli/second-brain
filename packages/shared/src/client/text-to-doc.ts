// Helpers para transformar texto cru (colado da IA) em conteúdo do app.
// O backend deriva `plainText` do `doc` TipTap, então um candidato colado precisa
// virar um doc com o texto dentro. Nada aqui persiste — só monta a estrutura.

/** Texto cru → doc TipTap mínimo (uma linha = um parágrafo; linhas vazias preservadas). */
export function textToDoc(text: string): Record<string, unknown> {
  const lines = text.split('\n');
  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      content: line.trim() ? [{ type: 'text', text: line }] : [],
    })),
  };
}

const SECTION_HEADERS: { re: RegExp; bucket: 'before' | 'during' | 'after' }[] =
  [
    { re: /^(antes|before)\b/i, bucket: 'before' },
    { re: /^(durante|during)\b/i, bucket: 'during' },
    { re: /^(depois|ap[óo]s|after)\b/i, bucket: 'after' },
  ];

/** Remove marcadores de lista/numeração no começo da linha. */
function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim();
}

// Faz o parse de uma resposta de IA em perguntas antes/durante/depois. Reconhece
// cabeçalhos "ANTES/DURANTE/DEPOIS" (pt) e "BEFORE/DURING/AFTER" (en); o que vier
// antes de qualquer cabeçalho cai em "before". Sempre editável depois (§9).
export function parseQuestions(text: string): {
  before: string[];
  during: string[];
  after: string[];
} {
  const result = {
    before: [] as string[],
    during: [] as string[],
    after: [] as string[],
  };
  let bucket: 'before' | 'during' | 'after' = 'before';

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const header = SECTION_HEADERS.find((h) => h.re.test(line));
    if (header) {
      bucket = header.bucket;
      // Se o cabeçalho tiver conteúdo na mesma linha (ex.: "Antes: pergunta?"), aproveita.
      const after = line.replace(/^[^:]*:\s*/, '');
      if (after && after !== line) {
        const q = stripBullet(after);
        if (q) result[bucket].push(q);
      }
      continue;
    }

    const q = stripBullet(line);
    if (q) result[bucket].push(q);
  }

  return result;
}
