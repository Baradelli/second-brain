export class NoteNotFoundError extends Error {
  constructor(id: string) {
    super(`Note not found: ${id}`);
    this.name = 'NoteNotFoundError';
  }
}

export class NotAJournalTypeError extends Error {
  constructor(type: string) {
    super(`Type '${type}' is not a journal type. Only DEVOTIONAL and REFLECTION are allowed.`);
    this.name = 'NotAJournalTypeError';
  }
}
