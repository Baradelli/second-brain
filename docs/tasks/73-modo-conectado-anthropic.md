# Tarefa 73 — (futuro) Modo conectado: `AiRunner` + `AnthropicRunner` (Bloco P)

> **Só quando o dono decidir ligar a IA de verdade.** Reusa os **mesmos templates** (Tarefa 70);
> a única novidade é executar o prompt via Anthropic SDK no backend e trazer a resposta. Mantém o
> §9: a resposta volta como **candidato**, nunca grava sozinha. Spec macro — detalhar fino ao chegar.

## Objetivo

Rodar `buildPrompt` server-side e chamar o modelo, devolvendo texto que o usuário confirma (reusa
o fluxo de "candidato" da Tarefa 72). Alternativa ao copiar/colar do modo cheap.

## Esboço de design

- **Porta `AiRunner`** (`src/usecases/ports/ai-runner.ts`):
  ```ts
  export interface AiRunner {
    run(prompt: BuiltPrompt): Promise<{ text: string }>;
  }
  ```

  - `CopyPasteRunner` (cheap): não executa — só ecoa o prompt (mantém a porta uniforme; útil em testes).
  - `AnthropicRunner` (conectado): chama o Anthropic SDK. **Modelo mais recente da família 4.x**
    (ver `claude-api`/skill antes de fixar o id). Sem streaming no MVP.
- **UseCase** `runAiSkill({ userId, skill, context })` → `buildPrompt` (shared) → `AiRunner.run` →
  retorna texto. Injeta o runner conforme `Settings.aiMode`.
- **Rota** `POST /ai/run` (autenticada) → `{ skill, context }` → `{ text }`. Erros de provedor →
  500/502 tratados; rate/limite → mensagem amigável.
- **Chave de API**: via `ANTHROPIC_API_KEY` no servidor (env), **não** no banco/cliente. Nota de
  segurança: nunca expor a chave ao frontend; o front só chama `/ai/run`.
- **Frontend**: quando `aiMode='connected'`, as superfícies chamam `/ai/run` e mostram a resposta
  no mesmo fluxo de **prévia + confirmação** da Tarefa 72 (em vez do copiar/colar).

## Limites (§9 — inegociável)

Sugerir/resumir/encontrar/apontar; **nunca** alterar dado sem confirmação, concluir objetivo,
arquivar sozinho, decidir no campo espiritual, nem fingir certeza. Toda saída é candidato.

## Fora de escopo

- Embeddings/busca semântica (MVP 4). Streaming. Auto-recap/difference-map (habilidades futuras).

## Definição de pronto (quando ativado)

- [x] `AiRunner` + `AnthropicRunner` reusando templates da 70; chave só no servidor (env).
      (`usecases/ports/ai-runner.ts`; `repositories/anthropic-runner.ts` (`claude-opus-4-8`, adaptive thinking) + `copy-paste-runner.ts`; `ANTHROPIC_API_KEY` via `new Anthropic()`)
- [x] `POST /ai/run` + UseCase respeitando `Settings.aiMode`; tratamento de erro de provedor.
      (`routes/ai-routes.ts`: cheap→ecoa prompt, connected→SDK; RateLimit→429, conexão/5xx→502; `shared/ai.ts` Zod)
- [x] Frontend usa prévia + confirmação (fluxo da 72); nenhuma escrita automática.
      (PromptSheet "Gerar com IA" quando `aiMode='connected'` → resultado cai no textarea editável → confirmação)
- [x] Testes do UseCase com `AiRunner` fake. Marcar BACKLOG. **Fim do Bloco P.**
      (4 testes de UseCase + 3 de rota no caminho cheap; smoke live contra a API ✓; backend 372u/172i, shared 19, mobile 123 verdes)
