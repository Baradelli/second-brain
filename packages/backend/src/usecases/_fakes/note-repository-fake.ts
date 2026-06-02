import type { Note } from '../../domain/note.js';
import type { NoteRepository } from '../ports/note-repository.js';

export class NoteRepositoryFake implements NoteRepository {
  readonly saved: Note[] = [];

  async save(note: Note): Promise<Note> {
    this.saved.push(note);
    return note;
  }
}
