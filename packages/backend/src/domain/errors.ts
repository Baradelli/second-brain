export class NoteNotFoundError extends Error {
  constructor(id: string) {
    super(`Note not found: ${id}`);
    this.name = 'NoteNotFoundError';
  }
}

export class NotAJournalTypeError extends Error {
  constructor(type: string) {
    super(
      `Type '${type}' is not a journal type. Only DEVOTIONAL and REFLECTION are allowed.`,
    );
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

export class LabelNotFoundError extends Error {
  constructor(id: string) {
    super(`Label not found: ${id}`);
    this.name = 'LabelNotFoundError';
  }
}

export class LabelParentInvalidError extends Error {
  constructor(parentId: string) {
    super(`Label parent is invalid or belongs to another user: ${parentId}`);
    this.name = 'LabelParentInvalidError';
  }
}

export class LabelCycleError extends Error {
  constructor(id: string) {
    super(`Label '${id}' cannot be its own ancestor.`);
    this.name = 'LabelCycleError';
  }
}

export class LabelInUseError extends Error {
  constructor(
    public readonly reason: 'items' | 'activeChildren',
    public readonly count: number,
  ) {
    const detail =
      reason === 'items'
        ? `label is used by ${count} item(s)`
        : `label has ${count} active child label(s)`;
    super(`Cannot archive label: ${detail}.`);
    this.name = 'LabelInUseError';
  }
}
