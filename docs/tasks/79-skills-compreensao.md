# Tarefas 79–81 — Bloco R: IA de compreensão expandida

> Origem: `docs/ANALISE-E-PLANO-MELHORIA.md` §4 (Bloco R). Padrão de mercado validado
> na pesquisa (§2.2): **o usuário produz → a IA questiona → a IA compara e aponta
> lacunas** — nunca "IA resume por você". Prompt-first: toda skill nasce nos DOIS
> modos (cheap e conectado), mesmos templates pt/en, moldura §9 no system.

## 79 — Skills novas no `PromptBuilder` (puro, TDD)

- **`study.explain`** — `{excerpt, resourceTitle?, level?: 'eli5'|'technical'}`:
  define termos e explica um TRECHO colado/grifado, ancorado no trecho; instrução
  explícita de NÃO resumir o material inteiro (anti-achatamento).
- **`study.socratic`** — `{title, fichamentoText}`: tutor que devolve APENAS
  perguntas (5–8, profundidade crescente) sobre o fichamento.
- **`study.difference_map`** — `{topic, sources: [{resourceTitle, author?,
  fichamentoText}]}` (mín. 2, validado na borda): concordância real × só
  vocabulário × divergência real + os 4 eixos por autor (tese distintiva,
  texto-chave, ponto fraco, diferença) — Práticas 4/5/9 em versão-prompt.
- União de `aiRunRequestSchema` (shared/ai.ts) e `RunAiSkillInput` ampliadas.
- `AnthropicRunner`: modelo via `ANTHROPIC_MODEL` (default `claude-opus-4-8`);
  `.env.example` documenta.

## 80 — Descritores de formulário no `shared`

`packages/web/src/assistant/assistant-skills.ts` (puro) virou
`packages/shared/src/assistant/skill-forms.ts`, cobrindo as 7 skills — web importa
de `@cerebro/shared`; o hub mobile (Tarefa 82) reusa. No hub, `difference_map`
compara DUAS fontes (campos A/B); a Tarefa 90 alimentará a skill com N fontes
reais. Testes movidos para `shared/src/assistant/__tests__/skill-forms.test.ts`
e ampliados.

## 81 — Superfícies nas duas plataformas

- **Web (AssistantTab)**: as 7 skills aparecem automaticamente (o hub itera
  `AI_SKILL_KEYS` + descritores); chaves i18n `ai.skill.*` e `assistant.field.*`
  novas (pt/en).
- **Mobile**: `study.socratic` no StudyItemsPage (mesmo fichamento do feedback);
  `study.explain` em cada grifo do HighlightsSection (excerpt = trecho + nota do
  leitor; resultado aplicável vira Note candidata no editor).
- Rótulo `settings.ai.mode.connected` corrigido ("(em breve)" caiu — o modo
  funciona desde a Tarefa 73).

## Testes

Shared 50 (build-prompt 28 + skill-forms 16 + local-day 6) · backend 507 unit
(caso das 3 skills no run-ai-skill) · web 140 · mobile 125.

## Fora de escopo

Hub Assistente no mobile (82); PromptSheet inline no web (83); `difference_map`
alimentado por dados reais (90); streaming (adiado, §6 do plano).
