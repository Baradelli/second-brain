/**
 * Grifo (Highlight): uma linha da tabela de marca-textos de um Recurso. Entrada
 * manual — cor (significado) + frase grifada + comentário curto — desacoplada do
 * editor TipTap. O comentário é a "nota baseada no grifo"; não há Note separada.
 */
export interface Highlight {
  id: string;
  userId: string;
  resourceId: string;
  colorId: string; // referencia Settings.highlightColors[].id (paleta efetiva)
  location: string | null; // opcional: 'p. 42' | 'cap. 3' | '12:30'
  quote: string; // a frase grifada
  comment: string | null; // o comentário/nota do grifo
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: Date | null;
  createdAt: Date;
}
