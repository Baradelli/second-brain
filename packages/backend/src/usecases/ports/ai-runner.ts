import type { BuiltPrompt } from '@cerebro/shared';

// Porta do executor de IA (Bloco P). O modo cheap não a usa (copiar/colar no front);
// o modo conectado a implementa via Anthropic SDK. Saída é candidato — nunca grava (§9).
export interface AiRunner {
  run(prompt: BuiltPrompt): Promise<{ text: string }>;
}
