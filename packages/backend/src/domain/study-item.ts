export type StudyItemStatus = 'ACTIVE' | 'ARCHIVED' | 'CONSOLIDATED';

export interface StudyQuestions {
  before: string[];
  during: string[];
  after: string[];
}

export interface StudyItem {
  id: string;
  userId: string;
  resourceId: string | null;
  title: string;
  reference: string | null;
  questions: StudyQuestions | null;
  fichamentoNoteId: string | null;
  status: StudyItemStatus;
  archivedAt: Date | null;
  createdAt: Date;
  labelIds: string[]; // vínculo resolvido no repo; no domínio é a lista de ids
}

// Preenche as três listas a partir de um input parcial; ausência total vira null.
export function normalizeQuestions(
  input: Partial<StudyQuestions> | null | undefined,
): StudyQuestions | null {
  if (input == null) return null;
  return {
    before: input.before ?? [],
    during: input.during ?? [],
    after: input.after ?? [],
  };
}
