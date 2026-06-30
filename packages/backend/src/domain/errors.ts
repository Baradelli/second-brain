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

export class HighlightNotFoundError extends Error {
  constructor(id: string) {
    super(`Highlight not found: ${id}`);
    this.name = 'HighlightNotFoundError';
  }
}

export class InvalidHighlightError extends Error {
  constructor(message: string) {
    super(`Invalid highlight: ${message}`);
    this.name = 'InvalidHighlightError';
  }
}

export class HighlightNotArchivedError extends Error {
  constructor(id: string) {
    super(`Highlight '${id}' must be archived before it can be deleted.`);
    this.name = 'HighlightNotArchivedError';
  }
}

export class HighlightColorNotFoundError extends Error {
  constructor(colorId: string) {
    super(`Highlight color not found in palette: ${colorId}`);
    this.name = 'HighlightColorNotFoundError';
  }
}

export class HighlightColorInUseError extends Error {
  constructor(public readonly count: number) {
    super(`Cannot remove highlight color: it is used by ${count} highlight(s).`);
    this.name = 'HighlightColorInUseError';
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

export class GoalNotArchivedError extends Error {
  constructor(id: string) {
    super(`Goal '${id}' must be archived before it can be deleted.`);
    this.name = 'GoalNotArchivedError';
  }
}

export class GoalHasDoneHistoryError extends Error {
  constructor(id: string) {
    super(`Cannot delete goal '${id}': it has completion history.`);
    this.name = 'GoalHasDoneHistoryError';
  }
}

export class GoalHasChildrenError extends Error {
  constructor(public readonly count: number) {
    super(`Cannot delete goal: it has ${count} child goal(s).`);
    this.name = 'GoalHasChildrenError';
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

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password.');
    this.name = 'InvalidCredentialsError';
  }
}

export class StudyItemNotFoundError extends Error {
  constructor(id: string) {
    super(`StudyItem not found: ${id}`);
    this.name = 'StudyItemNotFoundError';
  }
}

export class InvalidStudyItemError extends Error {
  constructor(message: string) {
    super(`Invalid study item: ${message}`);
    this.name = 'InvalidStudyItemError';
  }
}

export class RecallNotFoundError extends Error {
  constructor(id: string) {
    super(`Recall not found: ${id}`);
    this.name = 'RecallNotFoundError';
  }
}

export class InvalidRecallError extends Error {
  constructor(message: string) {
    super(`Invalid recall: ${message}`);
    this.name = 'InvalidRecallError';
  }
}

export class PublicationNotFoundError extends Error {
  constructor(id: string) {
    super(`Publication not found: ${id}`);
    this.name = 'PublicationNotFoundError';
  }
}

export class InvalidPublicationError extends Error {
  constructor(message: string) {
    super(`Invalid publication: ${message}`);
    this.name = 'InvalidPublicationError';
  }
}

// ── Hard delete: só itens arquivados, e bloqueado se houver referência ───────
// Generaliza a regra do DeleteGoal (ver docs/adr/0004-politica-de-exclusao.md).

export class NoteNotArchivedError extends Error {
  constructor(id: string) {
    super(`Note '${id}' must be archived before it can be deleted.`);
    this.name = 'NoteNotArchivedError';
  }
}

export class NoteHasReferencesError extends Error {
  constructor(
    public readonly reason: 'backlinks' | 'attachments' | 'studyItem' | 'draft',
    public readonly count: number,
  ) {
    const detail = {
      backlinks: `${count} other note(s) link to it`,
      attachments: `it has ${count} attachment(s)`,
      studyItem: `it is the fichamento of ${count} study item(s)`,
      draft: `it is the draft of ${count} publication(s)`,
    }[reason];
    super(`Cannot delete note: ${detail}.`);
    this.name = 'NoteHasReferencesError';
  }
}

export class CaptureNotArchivedError extends Error {
  constructor(id: string) {
    super(`Capture '${id}' must be archived before it can be deleted.`);
    this.name = 'CaptureNotArchivedError';
  }
}

export class CaptureHasReferencesError extends Error {
  constructor(public readonly count: number) {
    super(`Cannot delete capture: it has ${count} attachment(s).`);
    this.name = 'CaptureHasReferencesError';
  }
}

export class LabelNotArchivedError extends Error {
  constructor(id: string) {
    super(`Label '${id}' must be archived before it can be deleted.`);
    this.name = 'LabelNotArchivedError';
  }
}

export class StudyItemNotArchivedError extends Error {
  constructor(id: string) {
    super(`StudyItem '${id}' must be archived before it can be deleted.`);
    this.name = 'StudyItemNotArchivedError';
  }
}

export class StudyItemHasHistoryError extends Error {
  constructor(public readonly count: number) {
    super(
      `Cannot delete study item: it has ${count} recall(s) in its history.`,
    );
    this.name = 'StudyItemHasHistoryError';
  }
}

export class PublicationNotArchivedError extends Error {
  constructor(id: string) {
    super(`Publication '${id}' must be archived before it can be deleted.`);
    this.name = 'PublicationNotArchivedError';
  }
}

export class ResourceNotArchivedError extends Error {
  constructor(id: string) {
    super(`Resource '${id}' must be archived before it can be deleted.`);
    this.name = 'ResourceNotArchivedError';
  }
}

export class ResourceHasReferencesError extends Error {
  constructor(
    public readonly reason: 'notes' | 'studyItems' | 'highlights',
    public readonly count: number,
  ) {
    const detail = {
      notes: `${count} note(s) reference it`,
      studyItems: `${count} study item(s) reference it`,
      highlights: `${count} highlight(s) reference it`,
    }[reason];
    super(`Cannot delete resource: ${detail}.`);
    this.name = 'ResourceHasReferencesError';
  }
}
