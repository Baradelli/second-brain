import type { Note } from '../../domain/note.js';

export interface NoteRepository {
  save(note: Note): Promise<Note>;
}
