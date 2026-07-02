import type { PublicationFormatInput } from '../publication.js';
import { joinLines, type PromptTemplates } from './types.js';

// Moldura do §9 do plano (espelho, não piloto). Carregada no `system` de TODA skill.
// Verbatim em espírito: pode sugerir/resumir/encontrar/apontar; NUNCA decide, conclui,
// arquiva, decide no campo espiritual, nem finge certeza. Toda saída é candidato a confirmar.
const SYSTEM_FRAME = joinLines([
  'Você é um assistente de estudo dentro de um "segundo cérebro" pessoal.',
  'Você é um espelho ativo, não um piloto automático.',
  'PODE: sugerir, resumir, encontrar conexões e apontar lacunas ou contradições.',
  'NÃO PODE: decidir no lugar do usuário, concluir objetivos, arquivar coisas, tomar decisões espirituais ou devocionais por ele, nem fingir certeza sobre o estado dele.',
  'Toda saída sua é um CANDIDATO que o usuário revisa e confirma — você nunca altera dados sozinho.',
  'Se não tiver base para algo, diga que não sabe em vez de inventar.',
]);

function withRole(role: string): string {
  return joinLines([SYSTEM_FRAME, '', role]);
}

const FORMAT_LABEL: Record<PublicationFormatInput, string> = {
  linkedin: 'post de LinkedIn',
  substack: 'edição de newsletter (Substack)',
  blog: 'artigo de blog',
  lesson: 'roteiro de aula',
  video: 'roteiro de vídeo',
};

export const templatesPt: PromptTemplates = {
  'study.questions': (ctx) => ({
    system: withRole(
      'Tarefa atual: propor perguntas-guia para uma leitura, organizadas em antes/durante/depois.',
    ),
    user: joinLines([
      `Material a estudar: "${ctx.title}"`,
      ctx.reference && `Trecho: ${ctx.reference}`,
      ctx.resourceTitle &&
        `Fonte: ${ctx.resourceTitle}${ctx.author ? ` (de ${ctx.author})` : ''}`,
      !ctx.resourceTitle && ctx.author && `Autor: ${ctx.author}`,
      '',
      'Gere perguntas-guia para esta leitura em três listas separadas:',
      '- ANTES: ativar o conhecimento prévio e definir o que procurar;',
      '- DURANTE: manter a leitura ativa e checar a compreensão;',
      '- DEPOIS: consolidar e permitir auto-teste de memória.',
      'De 4 a 8 perguntas por lista, específicas a este material — nada genérico.',
    ]),
  }),

  'study.fichamento_feedback': (ctx) => ({
    system: withRole(
      'Tarefa atual: comparar um fichamento escrito de memória com o que o domínio do tema exigiria e apontar lacunas, com gentileza.',
    ),
    user: joinLines([
      `Tópico estudado: "${ctx.title}"`,
      ctx.sourceHint && `Pista da fonte: ${ctx.sourceHint}`,
      '',
      'Abaixo está o que o usuário reconstruiu DE MEMÓRIA, sem olhar o material:',
      '---',
      ctx.fichamentoText,
      '---',
      'Aponte, de forma específica e gentil: (1) o que está correto e bem lembrado; (2) lacunas ou imprecisões prováveis; (3) o que vale reestudar primeiro.',
      'Isto é um exercício de recuperação, não uma prova — o objetivo é aprender com o contraste, não pontuar.',
    ]),
  }),

  'study.quiz': (ctx) => ({
    system: withRole(
      'Tarefa atual: gerar um quiz curto de recuperação ativa para uma revisão espaçada.',
    ),
    user: joinLines([
      `Tópico: "${ctx.title}"`,
      ctx.topics &&
        ctx.topics.length > 0 &&
        `Focar nestes pontos: ${ctx.topics.join('; ')}`,
      '',
      'Gere um quiz curto (5 a 8 perguntas) que force lembrar antes de reler.',
      'Misture perguntas abertas e fechadas; comece pelo essencial.',
      'Coloque as respostas no fim, em uma seção separada, para autocorreção.',
    ]),
  }),

  'study.explain': (ctx) => ({
    system: withRole(
      'Tarefa atual: explicar um TRECHO específico e definir os termos difíceis dele — ancorado no trecho, sem resumir o material inteiro (o usuário lê a fonte; você só destrava a compreensão).',
    ),
    user: joinLines([
      ctx.resourceTitle && `Fonte: ${ctx.resourceTitle}`,
      'Trecho a explicar:',
      '---',
      ctx.excerpt,
      '---',
      'Explique o que este trecho está dizendo: (1) defina os termos técnicos ou incomuns; (2) reformule a ideia central com outras palavras; (3) aponte o que o autor está assumindo ou respondendo.',
      ctx.level === 'eli5' &&
        'Use linguagem simples, como para alguém inteligente de 12 anos — sem jargão.',
      'Não resuma o material inteiro nem vá além do trecho: o objetivo é destravar a leitura, não substituí-la.',
    ]),
  }),

  'study.socratic': (ctx) => ({
    system: withRole(
      'Tarefa atual: agir como tutor socrático sobre um fichamento — fazer APENAS perguntas que aprofundem, sem entregar respostas.',
    ),
    user: joinLines([
      `Tópico estudado: "${ctx.title}"`,
      '',
      'Fichamento do usuário (escrito de memória):',
      '---',
      ctx.fichamentoText,
      '---',
      'Responda com APENAS PERGUNTAS — nenhuma afirmação, resposta ou correção.',
      'De 5 a 8 perguntas, em ordem crescente de profundidade: comece checando o entendimento básico, avance para implicações e termine com perguntas que exponham tensões ou lacunas do próprio fichamento.',
      'Perguntas específicas a ESTE fichamento — nada genérico.',
    ]),
  }),

  'study.difference_map': (ctx) => ({
    system: withRole(
      'Tarefa atual: montar um mapa de DIFERENÇA entre autores sobre um mesmo tema — discriminar onde concordam, onde é só vocabulário e onde a divergência é real (Práticas 4/5/9 da leitura retentiva).',
    ),
    user: joinLines([
      `Tema: "${ctx.topic}"`,
      '',
      'O que o usuário estudou de cada autor:',
      ...ctx.sources.flatMap((s) => [
        `### ${s.resourceTitle}${s.author ? ` — ${s.author}` : ''}`,
        '---',
        s.fichamentoText,
        '---',
      ]),
      'Monte o mapa de diferença:',
      '1. Onde os autores CONCORDAM de verdade;',
      '2. Onde a divergência é SÓ DE VOCABULÁRIO (mesma ideia, termos diferentes);',
      '3. Onde há DIVERGÊNCIA REAL de tese — e qual é exatamente o desacordo;',
      '4. Para cada autor: a tese distintiva, o texto-chave que a sustenta, o ponto fraco do argumento e o que o separa dos demais.',
      'Baseie-se APENAS no que está nos fichamentos acima; onde faltar base, diga o que o usuário precisaria reler para decidir.',
    ]),
  }),

  'publish.draft': (ctx) => ({
    system: withRole(
      'Tarefa atual: transformar um material de estudo em um rascunho de publicação no formato pedido.',
    ),
    user: joinLines([
      `Formato-alvo: ${FORMAT_LABEL[ctx.format]}`,
      ctx.angle && `Ângulo desejado: ${ctx.angle}`,
      '',
      'Material de origem:',
      '---',
      ctx.sourceText,
      '---',
      `Escreva um rascunho de ${FORMAT_LABEL[ctx.format]} a partir deste material.`,
      'Mantenha a voz e as ideias do autor; não invente fatos que não estejam no material.',
      'Marque com [?] qualquer ponto que o usuário precise verificar antes de publicar.',
    ]),
  }),
};
