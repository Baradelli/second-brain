import type { Highlight } from '../domain/highlight.js';
import type { HighlightRepository } from './ports/highlight-repository.js';

export interface ListHighlightsInput {
  userId: string;
  resourceId: string;
  colorId?: string;
  status?: 'ACTIVE' | 'ARCHIVED'; // default 'ACTIVE'
}

/** Lista os grifos de um recurso, ordenados por createdAt (ordem de leitura). */
export class ListHighlights {
  constructor(private repo: HighlightRepository) {}

  async execute(input: ListHighlightsInput): Promise<Highlight[]> {
    const found = await this.repo.find({
      userId: input.userId,
      resourceId: input.resourceId,
      status: input.status ?? 'ACTIVE',
      ...(input.colorId ? { colorId: input.colorId } : {}),
    });
    return found.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
