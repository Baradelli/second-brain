import { type NoteType, noteType } from '@cerebro/shared';
import { RichEditor } from '@cerebro/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { createNote, editNote, getNoteById, getTodayNote } from '../lib/api/endpoints.js';

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
          }
        } else if (
          noteTypeParam === 'DEVOTIONAL' ||
          noteTypeParam === 'REFLECTION'
        ) {
          const existing = await getTodayNote(noteTypeParam);
          if (!cancelled && existing) {
            setDoc(existing.doc);
            setNoteId(existing.id);
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
    </div>
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
