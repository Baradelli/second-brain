import type { NoteResponse, NoteType, ResourceResponse } from '@cerebro/shared';
import { BottomSheet, Button, Card, EmptyState } from '@cerebro/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { LabelFilter } from '../components/LabelFilter.js';
import { archiveNote, listNotes, listResources } from '../lib/api/endpoints.js';

const NOTE_TYPES: { type: NoteType; labelKey: string; color: string }[] = [
  {
    type: 'DEVOTIONAL',
    labelKey: 'editor.type.devotional',
    color: 'var(--cerebro-devotional)',
  },
  {
    type: 'REFLECTION',
    labelKey: 'editor.type.reflection',
    color: 'var(--cerebro-reflection)',
  },
  {
    type: 'STUDY_NOTE',
    labelKey: 'editor.type.study',
    color: 'var(--cerebro-study)',
  },
  { type: 'NOTE', labelKey: 'editor.type.note', color: 'var(--cerebro-note)' },
];

const COLOR_BY_TYPE: Record<NoteType, string> = {
  DEVOTIONAL: 'var(--cerebro-devotional)',
  REFLECTION: 'var(--cerebro-reflection)',
  STUDY_NOTE: 'var(--cerebro-study)',
  NOTE: 'var(--cerebro-note)',
};
const LABEL_BY_TYPE: Record<NoteType, string> = {
  DEVOTIONAL: 'editor.type.devotional',
  REFLECTION: 'editor.type.reflection',
  STUDY_NOTE: 'editor.type.study',
  NOTE: 'editor.type.note',
};

type TypeFilter = 'all' | NoteType;
const FILTERS: TypeFilter[] = [
  'all',
  'DEVOTIONAL',
  'REFLECTION',
  'STUDY_NOTE',
  'NOTE',
];

function preview(note: NoteResponse): string {
  if (note.title?.trim()) return note.title.trim();
  const firstLine = note.plainText.split('\n').find((l) => l.trim());
  return firstLine?.trim() || '';
}

export function NotesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState<'type' | 'resource'>('type');
  const [resources, setResources] = useState<ResourceResponse[]>([]);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NoteResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resourceTitles, setResourceTitles] = useState<Record<string, string>>(
    {},
  );

  // Mapa id→título dos recursos, para rotular os fichamentos ("Fichamento · X").
  useEffect(() => {
    listResources({ status: 'ACTIVE' })
      .then((rs) =>
        setResourceTitles(Object.fromEntries(rs.map((r) => [r.id, r.title]))),
      )
      .catch(() => {});
  }, []);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await archiveNote(confirmDelete.id);
      setNotes((prev) => prev.filter((n) => n.id !== confirmDelete.id));
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  function openAdd() {
    setAddStep('type');
    setAddOpen(true);
  }

  function chooseType(type: NoteType) {
    if (type === 'STUDY_NOTE') {
      // Fichamento é sempre sobre um recurso → escolher o recurso primeiro.
      listResources({ status: 'ACTIVE' })
        .then(setResources)
        .catch(() => setResources([]));
      setAddStep('resource');
      return;
    }
    setAddOpen(false);
    navigate(`/editor?type=${type}`);
  }

  function chooseResource(resourceId: string) {
    setAddOpen(false);
    navigate(`/editor?type=STUDY_NOTE&resourceId=${resourceId}`);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listNotes({ status: 'ACTIVE', type: filter === 'all' ? undefined : filter })
      .then((data) => {
        if (!cancelled) setNotes(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const visible = labelFilter
    ? notes.filter((n) => n.labelIds?.includes(labelFilter))
    : notes;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1
          className="font-display text-[1.75rem] font-semibold leading-tight"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('notes.title')}
        </h1>
        <button
          type="button"
          onClick={openAdd}
          data-testid="new-note-button"
          className="inline-flex items-center gap-1.5 rounded-full px-4 text-xs font-semibold"
          style={{
            height: '2.25rem',
            backgroundColor: 'var(--cerebro-accent)',
            color: 'var(--cerebro-on-accent)',
          }}
        >
          <Plus size={16} strokeWidth={2.25} />
          {t('notes.new')}
        </button>
      </div>

      {/* Filtro por tipo */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              data-testid={`note-filter-${f}`}
              className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: active
                  ? 'var(--cerebro-accent-soft)'
                  : 'transparent',
                color: active
                  ? 'var(--cerebro-accent)'
                  : 'var(--cerebro-muted)',
                border: active
                  ? '1px solid transparent'
                  : '1px solid var(--cerebro-border)',
              }}
            >
              {f === 'all' ? t('notes.filter.all') : t(LABEL_BY_TYPE[f])}
            </button>
          );
        })}
      </div>

      {/* Filtro por label */}
      <LabelFilter value={labelFilter} onChange={setLabelFilter} />

      {loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.loading')}
        </p>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('notes.error')}
        </p>
      )}

      {!loading && !error && visible.length === 0 && (
        <EmptyState title={t('notes.empty')} />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="space-y-2.5" data-testid="notes-list">
          {visible.map((note) => (
            <Card key={note.id} padding="sm">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/editor/${note.id}`)}
                  data-testid={`note-${note.id}`}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left transition-transform duration-150 active:scale-[0.99]"
                >
                  <span
                    className="mt-1 h-8 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: COLOR_BY_TYPE[note.type] }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="mb-0.5 truncate text-[0.625rem] font-bold uppercase tracking-[0.14em]"
                      style={{ color: COLOR_BY_TYPE[note.type] }}
                    >
                      {t(LABEL_BY_TYPE[note.type])}
                      {note.type === 'STUDY_NOTE' &&
                      note.resourceId &&
                      resourceTitles[note.resourceId]
                        ? ` · ${resourceTitles[note.resourceId]}`
                        : ''}
                    </p>
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: 'var(--cerebro-fg)' }}
                    >
                      {preview(note) || t('notes.untitled')}
                    </p>
                    <p
                      className="mt-0.5 text-[0.6875rem]"
                      style={{ color: 'var(--cerebro-faint)' }}
                    >
                      {new Date(note.date).toLocaleDateString(i18n.language, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={t('notes.delete')}
                  data-testid={`delete-note-${note.id}`}
                  onClick={() => setConfirmDelete(note)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{ color: 'var(--cerebro-muted)' }}
                >
                  <Trash2 size={15} strokeWidth={1.85} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmação de exclusão (arquiva) */}
      <BottomSheet
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
      >
        <h2
          className="mb-1 font-display text-lg font-semibold"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('notes.deleteConfirm.title')}
        </h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('notes.deleteConfirm.body')}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setConfirmDelete(null)}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void handleDelete()}
            disabled={deleting}
            data-testid="confirm-delete"
            className="flex-1"
            style={{ backgroundColor: 'var(--cerebro-error)' }}
          >
            {t('notes.deleteConfirm.confirm')}
          </Button>
        </div>
      </BottomSheet>

      {/* Adicionar nota → escolher tipo (e recurso, se fichamento) → editor */}
      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)}>
        {addStep === 'type' ? (
          <>
            <p
              className="mb-4 font-display text-lg font-semibold"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {t('editor.chooseType')}
            </p>
            <div className="flex flex-col gap-2">
              {NOTE_TYPES.map(({ type, labelKey, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => chooseType(type)}
                  data-testid={`write-type-${type}`}
                  className="flex items-center gap-3 rounded-[var(--radius-card)] px-4 py-3.5 transition-all duration-150 active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--cerebro-raised)',
                    border: '1px solid var(--cerebro-border)',
                  }}
                >
                  <span
                    className="h-7 w-1 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'var(--cerebro-fg)' }}
                  >
                    {t(labelKey)}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p
              className="mb-1 font-display text-lg font-semibold"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {t('notes.chooseResource')}
            </p>
            <p
              className="mb-4 text-xs"
              style={{ color: 'var(--cerebro-muted)' }}
            >
              {t('notes.chooseResource.help')}
            </p>
            {resources.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p
                  className="text-sm"
                  style={{ color: 'var(--cerebro-muted)' }}
                >
                  {t('notes.noResources')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    navigate('/library');
                  }}
                  data-testid="go-to-library"
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--cerebro-accent)',
                    color: 'var(--cerebro-on-accent)',
                  }}
                >
                  {t('notes.goToLibrary')}
                </button>
              </div>
            ) : (
              <div className="flex max-h-[50vh] flex-col gap-2 overflow-auto">
                {resources.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => chooseResource(r.id)}
                    data-testid={`pick-resource-${r.id}`}
                    className="rounded-[var(--radius-card)] px-4 py-3 text-left text-sm font-medium transition-all duration-150 active:scale-[0.98]"
                    style={{
                      backgroundColor: 'var(--cerebro-raised)',
                      border: '1px solid var(--cerebro-border)',
                      color: 'var(--cerebro-fg)',
                    }}
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </BottomSheet>
    </main>
  );
}
