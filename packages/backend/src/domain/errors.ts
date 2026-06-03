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

export class NotARecapScopeError extends Error {
  constructor(scope: string) {
    super(`Scope '${scope}' is not valid for recap. Use WEEK, MONTH, or YEAR.`);
    this.name = 'NotARecapScopeError';
  }
}

export class CaptureNotFoundError extends Error {
  constructor(id: string) {
    super(`Capture not found: ${id}`);
    this.name = 'CaptureNotFoundError';
  }
}

export class CaptureAlreadyProcessedError extends Error {
  constructor(id: string) {
    super(`Capture '${id}' has already been processed or archived.`);
    this.name = 'CaptureAlreadyProcessedError';
  }
}
