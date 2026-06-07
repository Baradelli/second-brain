import type { Capture } from '../domain/capture.js';
import type { Note } from '../domain/note.js';
import type { Resource } from '../domain/resource.js';
import type { CaptureRepository } from './ports/capture-repository.js';
import type { NoteRepository } from './ports/note-repository.js';
import type { ResourceRepository } from './ports/resource-repository.js';

const LIMIT = 20;

export interface SearchAllInput {
  userId: string;
  query: string;
}

export interface SearchAllResult {
  notes: Note[];
  resources: Resource[];
  captures: Capture[];
}

function byRecent<T extends { createdAt: Date }>(a: T, b: T): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

/**
 * Busca simples por substring (case-insensitive) em notas/recursos/capturas ativos. Filtra em
 * memória — volumes pessoais são pequenos e evita espalhar busca pelos repositórios. NÃO é a
 * busca semântica (MVP 4).
 */
export class SearchAll {
  constructor(
    private notes: NoteRepository,
    private resources: ResourceRepository,
    private captures: CaptureRepository,
  ) {}

  async execute(input: SearchAllInput): Promise<SearchAllResult> {
    const q = input.query.trim().toLowerCase();
    if (q.length === 0) return { notes: [], resources: [], captures: [] };

    const [notes, resources, captures] = await Promise.all([
      this.notes.find({ userId: input.userId, status: 'ACTIVE' }),
      this.resources.find({ userId: input.userId, status: 'ACTIVE' }),
      this.captures.find({ userId: input.userId, status: 'PENDING' }),
    ]);

    return {
      notes: notes
        .filter((n) =>
          `${n.title ?? ''} ${n.plainText}`.toLowerCase().includes(q),
        )
        .sort(byRecent)
        .slice(0, LIMIT),
      resources: resources
        .filter((r) =>
          `${r.title} ${r.author ?? ''} ${r.description ?? ''}`
            .toLowerCase()
            .includes(q),
        )
        .sort(byRecent)
        .slice(0, LIMIT),
      captures: captures
        .filter((c) => c.text.toLowerCase().includes(q))
        .sort(byRecent)
        .slice(0, LIMIT),
    };
  }
}
