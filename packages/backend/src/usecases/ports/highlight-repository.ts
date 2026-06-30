import type { Highlight } from '../../domain/highlight.js';

export interface HighlightFilter {
  userId: string;
  resourceId?: string;
  colorId?: string;
  status?: Highlight['status'];
}

export interface HighlightRepository {
  save(highlight: Highlight): Promise<Highlight>;
  byId(id: string): Promise<Highlight | null>;
  find(filter: HighlightFilter): Promise<Highlight[]>;
  update(id: string, patch: Partial<Highlight>): Promise<Highlight>;
  delete(id: string): Promise<void>; // hard delete — só grifos arquivados
  /** Quantos grifos ATIVOS do usuário usam esta cor (bloqueia remoção da cor). */
  countByColor(userId: string, colorId: string): Promise<number>;
}
