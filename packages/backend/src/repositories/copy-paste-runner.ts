import type { BuiltPrompt } from '@cerebro/shared';

import type { AiRunner } from '../usecases/ports/ai-runner.js';

// Modo cheap: não executa nada — só ecoa o prompt montado para o usuário copiar/colar
// no seu próprio chat. Mantém a porta uniforme e a IA não toca em dado algum (§9).
export class CopyPasteRunner implements AiRunner {
  async run(prompt: BuiltPrompt): Promise<{ text: string }> {
    return { text: `${prompt.system}\n\n${prompt.user}` };
  }
}
