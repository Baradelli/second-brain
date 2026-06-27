import type { BuiltPrompt } from '@cerebro/shared';

import type { AiRunner } from '../ports/ai-runner.js';

// Fake determinístico para os testes do UseCase. Registra o último prompt recebido
// e devolve uma resposta canned (ou uma lançada por configuração, para testar erro).
export class AiRunnerFake implements AiRunner {
  lastPrompt: BuiltPrompt | null = null;
  response = 'resposta da IA';
  error: Error | null = null;

  async run(prompt: BuiltPrompt): Promise<{ text: string }> {
    this.lastPrompt = prompt;
    if (this.error) throw this.error;
    return { text: this.response };
  }
}
