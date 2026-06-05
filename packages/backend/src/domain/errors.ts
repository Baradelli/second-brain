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

export class GuideQuestionNotFoundError extends Error {
  constructor(id: string) {
    super(`GuideQuestion not found: ${id}`);
    this.name = 'GuideQuestionNotFoundError';
  }
}

export class ResourceNotFoundError extends Error {
  constructor(id: string) {
    super(`Resource not found: ${id}`);
    this.name = 'ResourceNotFoundError';
  }
}

export class InvalidResourceError extends Error {
  constructor(message: string) {
    super(`Invalid resource: ${message}`);
    this.name = 'InvalidResourceError';
  }
}

export class GoalNotFoundError extends Error {
  constructor(id: string) {
    super(`Goal not found: ${id}`);
    this.name = 'GoalNotFoundError';
  }
}

export class InvalidGoalError extends Error {
  constructor(message: string) {
    super(`Invalid goal: ${message}`);
    this.name = 'InvalidGoalError';
  }
}

export class GoalHasActiveChildrenError extends Error {
  constructor(public readonly count: number) {
    super(`Cannot archive goal: it has ${count} active child goal(s).`);
    this.name = 'GoalHasActiveChildrenError';
  }
}

export class EventNotFoundError extends Error {
  constructor(id: string) {
    super(`Event not found: ${id}`);
    this.name = 'EventNotFoundError';
  }
}

export class InvalidCheckError extends Error {
  constructor(message: string) {
    super(`Invalid check: ${message}`);
    this.name = 'InvalidCheckError';
  }
}
