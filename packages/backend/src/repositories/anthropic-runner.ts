import Anthropic from '@anthropic-ai/sdk';
import type { BuiltPrompt } from '@cerebro/shared';

import type { AiRunner } from '../usecases/ports/ai-runner.js';

// Modelo configurável por env (Tarefa 79); default = Opus mais recente.
// Sem streaming no MVP (decisão registrada em ANALISE-E-PLANO-MELHORIA §6).
const MODEL = process.env['ANTHROPIC_MODEL'] ?? 'claude-opus-4-8';
const MAX_TOKENS = 16000;

// Modo conectado: roda o prompt via Anthropic SDK e devolve o texto. A chave vem de
// ANTHROPIC_API_KEY no servidor (env) — nunca do cliente. Saída é candidato (§9).
export class AnthropicRunner implements AiRunner {
  private client: Anthropic;

  constructor(client?: Anthropic) {
    // `new Anthropic()` lê ANTHROPIC_API_KEY do ambiente do servidor.
    this.client = client ?? new Anthropic();
  }

  async run(prompt: BuiltPrompt): Promise<{ text: string }> {
    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    // Extrai só os blocos de texto (blocos de thinking vêm vazios por padrão).
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return { text };
  }
}
