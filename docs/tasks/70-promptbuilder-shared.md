# Tarefa 70 — `PromptBuilder` em `shared/` (Bloco P)

> Abre o **Bloco P — Agente IA (prompt-first)**. O **produto real são os templates de prompt**:
> puros, versionados, i18n, **testáveis**. Ficam em `shared/` porque back e front usam (no modo
> cheap o front monta; no conectado o back roda — mesmos templates). Design em
> `docs/LEITURA-RETENTIVA.md` (§6). **Aderência ao §9 do plano** (espelho, não piloto).
>
> **Antes de começar, leia `docs/CONVENCOES-CODIGO.md`.**

## Objetivo

Uma função pura `buildPrompt(skillKey, context, locale)` que monta o prompt (com o conteúdo do
usuário interpolado) para cada **habilidade** do agente. Determinística → TDD direto, sem rede.

## Contrato (`packages/shared/src/prompt/`)

```ts
export type AiSkillKey =
  | 'study.questions' // perguntas antes/durante/depois (Prática 2)
  | 'study.fichamento_feedback' // comparar fichamento × material, apontar lacunas (1/6)
  | 'study.quiz' // quiz de recuperação ativa (3/7)
  | 'publish.draft'; // rascunho de post/artigo/roteiro por formato (Bloco O)

export type PromptLocale = 'pt' | 'en';

export interface BuiltPrompt {
  skill: AiSkillKey;
  system: string; // instrução de papel/limites (cita o espírito do §9: sugere, não decide)
  user: string; // o pedido com o contexto do usuário interpolado
}

export function buildPrompt(
  skill: AiSkillKey,
  context: PromptContext, // união discriminada por skill
  locale?: PromptLocale, // default 'pt'
): BuiltPrompt;
```

`PromptContext` = união discriminada por skill, ex.:

- `study.questions`: `{ title; reference?; resourceTitle?; author? }`
- `study.fichamento_feedback`: `{ title; fichamentoText; sourceHint? }`
- `study.quiz`: `{ title; topics?: string[] }`
- `publish.draft`: `{ format: PublicationFormat; sourceText; angle? }`

Templates vivem em `prompt/templates.{pt,en}.ts` (ou um mapa por locale). Cada template é uma
função `(ctx) => { system, user }` — **sem efeitos colaterais**, sem `Date.now`/`Math.random`.

## Regras (o que os testes provam)

1. Interpola o contexto no `user` (título, formato, texto…).
2. Campos opcionais ausentes não quebram (omitem a linha correspondente).
3. `locale` seleciona pt/en; default pt.
4. `skill` desconhecida → erro (`UnknownAiSkillError` ou `throw`).
5. O `system` de toda skill carrega a moldura do §9 (sugerir/resumir/encontrar; **nunca** decidir
   no lugar do usuário; pode errar — não fingir certeza). String estável (snapshot por skill).
6. Determinismo: mesma entrada → mesma saída (sem aleatoriedade/relógio).

## Testes (Vitest, em `shared`)

`shared/src/prompt/__tests__/build-prompt.test.ts`: um bloco por skill (interpolação + opcionais),
locale pt/en, skill inválida, e um teste garantindo que `system` menciona os limites do §9.
(`shared` já tem `vitest run --passWithNoTests` no script `test`.)

## Arquivos

- `packages/shared/src/prompt/index.ts` (buildPrompt + tipos), `templates.pt.ts`, `templates.en.ts`.
- export no `packages/shared/src/index.ts`.
- testes.
- **Não** tocar back/front ainda (cheap UI é a 71).

## Fora de escopo

- Qualquer execução/HTTP/IA real. UI. Porta `AiRunner` (modo conectado — Tarefa 73).

## Definição de pronto

- [ ] `buildPrompt` puro + 4 skills + templates pt/en, exportados de `shared/`.
- [ ] Testes cobrindo interpolação, opcionais, locale, skill inválida e moldura §9; verdes.
- [ ] Determinístico (sem relógio/aleatório). Marcar BACKLOG.
