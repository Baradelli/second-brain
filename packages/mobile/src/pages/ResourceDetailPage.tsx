import type { NoteResponse, NoteType, ResourceResponse } from '@cerebro/shared';
import { Button, Card, EmptyState } from '@cerebro/ui';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  GraduationCap,
  type LucideIcon,
  Mic,
  Plus,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { getResource, listNotes } from '../lib/api/endpoints.js';

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
  return note.plainText.split('\n').find((l) => l.trim())?.trim() ?? '';
}

export function ResourceDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();

  const [resource, setResource] = useState<ResourceResponse | null>(null);
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      <button
        type="button"
        aria-label={t('common.back')}
        onClick={() => navigate(-1)}
        data-testid="back"
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[var(--cerebro-accent-soft)]"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        <ArrowLeft size={20} strokeWidth={1.75} />
      </button>

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

          {notes.length === 0 ? (
            <EmptyState title={t('resource.notes.empty')} />
          ) : (
            <div className="space-y-2.5" data-testid="resource-notes">
              {notes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => navigate(`/editor/${note.id}`)}
                  data-testid={`note-${note.id}`}
                  className="w-full text-left transition-transform duration-150 active:scale-[0.99]"
                >
                  <Card padding="sm">
                    <div className="flex items-start gap-3">
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
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
