import { type NoteType, noteType, type AttachmentResponse, type SuggestedQuestionsGroupResponse } from '@cerebro/shared';
import { BottomSheet, RichEditor } from '@cerebro/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  attachFileToNote,
  createNote,
  editNote,
  getNoteAttachments,
  getNoteById,
  getSuggestedQuestions,
  getTodayNote,
} from '../lib/api/endpoints.js';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface RitualConfig {
  color: string;
  labelKey: string;
  subtitleKey: string;
  placeholderKey: string;
}

const RITUAL: Record<NoteType, RitualConfig> = {
  DEVOTIONAL: {
    color: '#C17D41',
    labelKey: 'editor.type.devotional',
    subtitleKey: 'editor.subtitle.devotional',
    placeholderKey: 'editor.placeholder.devotional',
  },
  REFLECTION: {
    color: '#6D5DFC',
    labelKey: 'editor.type.reflection',
    subtitleKey: 'editor.subtitle.reflection',
    placeholderKey: 'editor.placeholder.reflection',
  },
  STUDY_NOTE: {
    color: '#0EA5A0',
    labelKey: 'editor.type.study',
    subtitleKey: 'editor.subtitle.study',
    placeholderKey: 'editor.placeholder.study',
  },
  NOTE: {
    color: '#8A8A95',
    labelKey: 'editor.type.note',
    subtitleKey: 'editor.subtitle.note',
    placeholderKey: 'editor.placeholder.note',
  },
};

function resolveType(raw: string | null): NoteType {
  const parsed = noteType.safeParse(raw);
  return parsed.success ? parsed.data : 'NOTE';
}

export function EditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { noteId: routeNoteId } = useParams<{ noteId?: string }>();
  const [searchParams] = useSearchParams();

  const noteTypeParam = resolveType(searchParams.get('type'));
  const ritual = RITUAL[noteTypeParam];

  const [noteId, setNoteId] = useState<string | null>(routeNoteId ?? null);
  const [doc, setDoc] = useState<Record<string, unknown> | undefined>();
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentResponse[]>([]);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (routeNoteId) {
          const note = await getNoteById(routeNoteId);
          if (!cancelled) {
            setDoc(note.doc);
            setNoteId(note.id);
            setLabelIds(note.labelIds ?? []);
          }
        } else if (
          noteTypeParam === 'DEVOTIONAL' ||
          noteTypeParam === 'REFLECTION'
        ) {
          const existing = await getTodayNote(noteTypeParam);
          if (!cancelled && existing) {
            setDoc(existing.doc);
            setNoteId(existing.id);
            setLabelIds(existing.labelIds ?? []);
          }
        }
      } catch {
        // non-critical — editor starts empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [routeNoteId, noteTypeParam]);

  // Load attachments when noteId becomes available
  useEffect(() => {
    if (!noteId) {
      setAttachments([]);
      return;
    }
    getNoteAttachments(noteId).then(setAttachments).catch(() => {});
  }, [noteId]);

  const handleChange = useCallback(
    (newDoc: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

      setSaveStatus('saving');

      debounceRef.current = setTimeout(async () => {
        try {
          if (noteId) {
            await editNote(noteId, { doc: newDoc });
          } else {
            const created = await createNote({
              type: noteTypeParam,
              doc: newDoc,
            });
            setNoteId(created.id);
          }
          setSaveStatus('saved');
          savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
          setSaveStatus('error');
        }
      }, 1500);
    },
    [noteId, noteTypeParam],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    [],
  );

  if (loading) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center"
        style={{ backgroundColor: 'var(--cerebro-bg)' }}
      >
        <LoadingDots />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ backgroundColor: 'var(--cerebro-bg)' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--cerebro-border)' }}
      >
        <button
          type="button"
          aria-label={t('common.back')}
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity duration-150 hover:opacity-70 active:scale-95"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          <ChevronLeftIcon />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t('editor.questions.button')}
            onClick={() => setQuestionsOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-opacity duration-150 hover:opacity-70 active:scale-95"
            style={{
              color: 'var(--cerebro-muted)',
              border: '1px solid var(--cerebro-border)',
            }}
          >
            <QuestionMarkIcon />
            {t('editor.questions.button')}
          </button>

          <button
            type="button"
            aria-label={t('editor.attach.button')}
            onClick={() => setAttachOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-opacity duration-150 hover:opacity-70 active:scale-95"
            style={{
              color: 'var(--cerebro-muted)',
              border: '1px solid var(--cerebro-border)',
            }}
          >
            <CameraIcon />
            {attachments.length > 0 ? attachments.length : t('editor.attach.button')}
          </button>
        </div>

        <SaveIndicator status={saveStatus} t={t} />
      </div>

      {/* ── Ritual header ───────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4">
        <div className="mb-1.5 flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: ritual.color }}
            aria-hidden
          />
          <span
            className="text-[0.625rem] font-bold uppercase tracking-[0.14em]"
            style={{ color: ritual.color }}
          >
            {t(ritual.labelKey)}
          </span>
        </div>
        <p
          className="text-sm leading-relaxed"
          style={{
            fontFamily: 'Georgia, ui-serif, serif',
            fontStyle: 'italic',
            color: 'var(--cerebro-muted)',
          }}
        >
          {t(ritual.subtitleKey)}
        </p>
      </div>

      {/* ── Editor ──────────────────────────────────────────────────────── */}
      <div className="flex-1">
        <RichEditor
          doc={doc}
          placeholder={t(ritual.placeholderKey)}
          onChange={handleChange}
        />
      </div>

      {/* ── Panels ──────────────────────────────────────────────────────── */}
      <QuestionsPanel
        open={questionsOpen}
        onClose={() => setQuestionsOpen(false)}
        labelIds={labelIds}
      />

      <AttachmentsPanel
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        noteId={noteId}
        attachments={attachments}
        onAttached={(att) => setAttachments((prev) => [...prev, att])}
      />
    </div>
  );
}

// ── QuestionsPanel ────────────────────────────────────────────────────────────

function QuestionsPanel({
  open,
  onClose,
  labelIds,
}: {
  open: boolean;
  onClose: () => void;
  labelIds: string[];
}) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<SuggestedQuestionsGroupResponse[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    getSuggestedQuestions(labelIds)
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setFetching(false));
  }, [open, labelIds]);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2
        className="mb-4 text-base font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('editor.questions.title')}
      </h2>

      {fetching ? (
        <div className="py-6 flex justify-center">
          <LoadingDots />
        </div>
      ) : groups.length === 0 ? (
        <p className="py-4 text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('editor.questions.empty')}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.label.id}>
              <p
                className="mb-2 text-[0.625rem] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--cerebro-accent)' }}
              >
                {group.label.name}
              </p>
              <ul className="flex flex-col gap-2">
                {group.questions.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-start gap-2 text-sm leading-relaxed"
                    style={{ color: 'var(--cerebro-fg)' }}
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: 'var(--cerebro-muted)' }}
                      aria-hidden
                    />
                    {q.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}

// ── AttachmentsPanel ──────────────────────────────────────────────────────────

function AttachmentsPanel({
  open,
  onClose,
  noteId,
  attachments,
  onAttached,
}: {
  open: boolean;
  onClose: () => void;
  noteId: string | null;
  attachments: AttachmentResponse[];
  onAttached: (att: AttachmentResponse) => void;
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !noteId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setUploading(true);
      attachFileToNote(noteId, {
        url,
        type: 'image',
        mimeType: file.type || undefined,
        name: file.name,
        size: file.size,
      })
        .then(onAttached)
        .catch(() => {})
        .finally(() => {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        });
    };
    reader.readAsDataURL(file);
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2
        className="mb-4 text-base font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('editor.attach.title')}
      </h2>

      {noteId ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
            aria-label={t('editor.attach.add')}
            data-testid="file-input"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-opacity duration-150 disabled:opacity-50"
            style={{
              border: '1px dashed var(--cerebro-border)',
              color: 'var(--cerebro-muted)',
            }}
          >
            <CameraIcon />
            {uploading ? '…' : t('editor.attach.add')}
          </button>

          {attachments.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {attachments.map((att) => (
                <img
                  key={att.id}
                  src={att.url}
                  alt={att.name ?? 'Anexo'}
                  className="aspect-square w-full rounded-lg object-cover"
                  style={{ border: '1px solid var(--cerebro-border)' }}
                />
              ))}
            </div>
          ) : (
            <p
              className="mt-4 text-center text-sm"
              style={{ color: 'var(--cerebro-muted)' }}
            >
              {t('editor.attach.empty')}
            </p>
          )}
        </>
      ) : (
        <p className="py-4 text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('editor.attach.noNote')}
        </p>
      )}
    </BottomSheet>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SaveIndicator({
  status,
  t,
}: {
  status: SaveStatus;
  t: (key: string) => string;
}) {
  if (status === 'idle') return <div className="h-5 w-20" aria-hidden />;

  const configs = {
    saving: { dotClass: 'animate-pulse', dotColor: '#C17D41', textKey: 'editor.status.saving' },
    saved: { dotClass: '', dotColor: '#22c55e', textKey: 'editor.status.saved' },
    error: { dotClass: '', dotColor: '#ef4444', textKey: 'editor.status.error' },
  } as const;

  const cfg = configs[status];

  return (
    <div
      className="flex items-center gap-1.5 text-[0.6875rem] transition-opacity duration-200"
      style={{ color: 'var(--cerebro-muted)' }}
    >
      <div
        className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`}
        style={{ backgroundColor: cfg.dotColor }}
        aria-hidden
      />
      <span>{t(cfg.textKey)}</span>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1.5" aria-label="Carregando">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-1.5 w-1.5 animate-pulse rounded-full"
          style={{
            backgroundColor: 'var(--cerebro-muted)',
            opacity: 0.4,
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function QuestionMarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
