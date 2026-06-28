import type { NoteResponse, NoteType, ResourceResponse } from '@cerebro/shared';
import {
  archiveNote,
  type CreateResourceBody,
  editResource,
  getResource,
  listNotes,
} from '@cerebro/shared/client';
import { BottomSheet, Button, Card, EmptyState } from '@cerebro/ui';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  GraduationCap,
  type LucideIcon,
  Mic,
  Pencil,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
// GraduationCap is also used as the "study item" entry-point icon below.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { ResourceForm } from '../components/ResourceForm.js';

const TYPE_ICON: Record<string, LucideIcon> = {
  book: BookOpen,
  course: GraduationCap,
  video: Video,
  article: FileText,
  podcast: Mic,
  other: BookOpen,
};

const NOTE_COLOR: Record<NoteType, string> = {
  DEVOTIONAL: 'var(--cerebro-devotional)',
  REFLECTION: 'var(--cerebro-reflection)',
  STUDY_NOTE: 'var(--cerebro-study)',
  NOTE: 'var(--cerebro-note)',
};

function notePreview(note: NoteResponse): string {
  if (note.title?.trim()) return note.title.trim();
  return (
    note.plainText
      .split('\n')
      .find((l) => l.trim())
      ?.trim() ?? ''
  );
}

export function ResourceDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();

  const [resource, setResource] = useState<ResourceResponse | null>(null);
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<NoteResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleEditSubmit(body: CreateResourceBody) {
    setSavingEdit(true);
    try {
      const updated = await editResource(id, body);
      setResource(updated);
      setEditOpen(false);
    } finally {
      setSavingEdit(false);
    }
  }

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([getResource(id), listNotes({ resourceId: id })])
      .then(([r, ns]) => {
        if (!cancelled) {
          setResource(r);
          setNotes(ns);
        }
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
  }, [id]);

  const Icon = resource ? (TYPE_ICON[resource.type] ?? BookOpen) : BookOpen;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-4 pb-24">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label={t('common.back')}
          onClick={() => navigate(-1)}
          data-testid="back"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--cerebro-accent-soft)]"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        {resource && !loading && !error && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditOpen(true)}
            data-testid="edit-resource"
          >
            <Pencil size={15} strokeWidth={1.85} />
            {t('library.edit')}
          </Button>
        )}
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.loading')}
        </p>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('library.error')}
        </p>
      )}

      {resource && !loading && !error && (
        <>
          <div className="mb-5 flex items-start gap-3">
            <span
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--cerebro-accent-soft)',
                color: 'var(--cerebro-accent)',
              }}
              aria-hidden
            >
              <Icon size={22} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <h1
                className="font-display text-[1.5rem] font-semibold leading-tight"
                style={{ color: 'var(--cerebro-fg)' }}
              >
                {resource.title}
              </h1>
              <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
                {t(`resource.type.${resource.type}`)}
                {resource.author ? ` · ${resource.author}` : ''}
                {` · ${t(`resource.stage.${resource.stage}`)}`}
              </p>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--cerebro-muted)' }}
            >
              {t('resource.notes.title')}
            </h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(`/study?new=1&resourceId=${id}`)}
                data-testid="new-study-item"
              >
                <GraduationCap size={15} strokeWidth={1.85} />
                {t('study.fromResource')}
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  navigate(`/editor?type=STUDY_NOTE&resourceId=${id}`)
                }
                data-testid="new-study-note"
              >
                <Plus size={16} strokeWidth={2.25} />
                {t('resource.notes.new')}
              </Button>
            </div>
          </div>

          {notes.length === 0 ? (
            <EmptyState title={t('resource.notes.empty')} />
          ) : (
            <div className="space-y-2.5" data-testid="resource-notes">
              {notes.map((note) => (
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
                        style={{ backgroundColor: NOTE_COLOR[note.type] }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-medium"
                          style={{ color: 'var(--cerebro-fg)' }}
                        >
                          {notePreview(note) || t('notes.untitled')}
                        </p>
                        <p
                          className="mt-0.5 text-[0.6875rem]"
                          style={{ color: 'var(--cerebro-faint)' }}
                        >
                          {new Date(note.date).toLocaleDateString(
                            i18n.language,
                            { day: 'numeric', month: 'short' },
                          )}
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
        </>
      )}

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

      {/* Editar recurso */}
      <BottomSheet open={editOpen} onClose={() => setEditOpen(false)}>
        {resource && (
          <ResourceForm
            key={resource.id}
            initial={resource}
            onSubmit={handleEditSubmit}
            submitting={savingEdit}
          />
        )}
      </BottomSheet>
    </main>
  );
}
