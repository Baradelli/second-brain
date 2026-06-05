import {
  type AttachmentResponse,
  type NoteType,
  noteType,
  type SuggestedQuestionsGroupResponse,
} from '@cerebro/shared';
import { BottomSheet, RichEditor } from '@cerebro/ui';
import { ArrowLeft, Camera, HelpCircle, ImagePlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  attachFileToNote,
  getNoteAttachments,
  getNoteById,
  getSuggestedQuestions,
  getTodayNote,
  uploadAttachmentFile,
} from '../lib/api/endpoints.js';
import {
  persistNoteCreate,
  persistNoteEdit,
  resolveNoteRef,
} from '../lib/offline/index.js';
import {
  clearDraft,
  draftKey,
  loadDraft,
  saveDraft,
} from '../lib/offline/note-draft.js';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'queued' | 'error';

interface RitualConfig {
  color: string;
  labelKey: string;
  subtitleKey: string;
  placeholderKey: string;
}

const RITUAL: Record<NoteType, RitualConfig> = {
  DEVOTIONAL: {
    color: 'var(--cerebro-devotional)',
    labelKey: 'editor.type.devotional',
    subtitleKey: 'editor.subtitle.devotional',
    placeholderKey: 'editor.placeholder.devotional',
  },
  REFLECTION: {
    color: 'var(--cerebro-reflection)',
    labelKey: 'editor.type.reflection',
    subtitleKey: 'editor.subtitle.reflection',
    placeholderKey: 'editor.placeholder.reflection',
  },
  STUDY_NOTE: {
    color: 'var(--cerebro-study)',
    labelKey: 'editor.type.study',
    subtitleKey: 'editor.subtitle.study',
    placeholderKey: 'editor.placeholder.study',
  },
  NOTE: {
    color: 'var(--cerebro-note)',
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
  const resourceIdParam = searchParams.get('resourceId') ?? undefined;
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
      let resolvedNoteId: string | null = null;
      try {
        if (routeNoteId) {
          // Se a rota traz um id temporário (nota criada offline já sincronizada),
          // traduz para o id real antes de buscar.
          const realId = await resolveNoteRef(routeNoteId);
          const note = await getNoteById(realId);
          if (!cancelled) {
            setDoc(note.doc);
            setNoteId(note.id);
            setLabelIds(note.labelIds ?? []);
            resolvedNoteId = note.id;
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
            resolvedNoteId = existing.id;
          }
        }
      } catch {
        // non-critical — editor starts empty (ou cai no rascunho abaixo)
      } finally {
        // Rascunho local tem precedência: se há texto não sincronizado, restaura.
        const draft = loadDraft(draftKey(resolvedNoteId, noteTypeParam));
        if (!cancelled && draft) setDoc(draft);
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
    getNoteAttachments(noteId)
      .then(setAttachments)
      .catch(() => {});
  }, [noteId]);

  const handleChange = useCallback(
    (newDoc: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

      setSaveStatus('saving');

      debounceRef.current = setTimeout(async () => {
        // Rede de segurança: grava o rascunho local antes de tentar a rede.
        const key = draftKey(noteId, noteTypeParam);
        saveDraft(key, newDoc);
        try {
          let queued: boolean;
          if (noteId) {
            ({ queued } = await persistNoteEdit(noteId, { doc: newDoc }));
          } else {
            const created = await persistNoteCreate({
              noteType: noteTypeParam,
              doc: newDoc,
              resourceId: resourceIdParam,
            });
            setNoteId(created.id);
            queued = created.queued;
          }
          if (queued) {
            // Salvo offline: mantém o rascunho até sincronizar.
            setSaveStatus('queued');
          } else {
            clearDraft(key);
            setSaveStatus('saved');
            savedTimerRef.current = setTimeout(
              () => setSaveStatus('idle'),
              2000,
            );
          }
        } catch {
          setSaveStatus('error');
        }
      }, 1500);
    },
    [noteId, noteTypeParam, resourceIdParam],
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
      className="mx-auto flex min-h-dvh max-w-2xl flex-col"
      style={{ backgroundColor: 'var(--cerebro-bg)' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-3 py-2.5"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--cerebro-bg) 82%, transparent)',
          borderBottom: '1px solid var(--cerebro-border)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <button
          type="button"
          aria-label={t('common.back')}
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 hover:bg-[var(--cerebro-accent-soft)] active:scale-90"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={t('editor.questions.button')}
            onClick={() => setQuestionsOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all duration-150 hover:bg-[var(--cerebro-accent-soft)] active:scale-95"
            style={{
              color: 'var(--cerebro-muted)',
              border: '1px solid var(--cerebro-border)',
            }}
          >
            <HelpCircle size={15} strokeWidth={1.85} />
            {t('editor.questions.button')}
          </button>

          <button
            type="button"
            aria-label={t('editor.attach.button')}
            onClick={() => setAttachOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all duration-150 hover:bg-[var(--cerebro-accent-soft)] active:scale-95"
            style={{
              color: 'var(--cerebro-muted)',
              border: '1px solid var(--cerebro-border)',
            }}
          >
            <Camera size={15} strokeWidth={1.85} />
            {attachments.length > 0
              ? attachments.length
              : t('editor.attach.button')}
          </button>
        </div>

        <SaveIndicator status={saveStatus} t={t} />
      </div>

      {/* ── Ritual header ───────────────────────────────────────────────── */}
      <div className="px-6 pt-6 pb-3">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="h-4 w-1 rounded-full"
            style={{ backgroundColor: ritual.color }}
            aria-hidden
          />
          <span
            className="text-[0.6875rem] font-bold uppercase tracking-[0.16em]"
            style={{ color: ritual.color }}
          >
            {t(ritual.labelKey)}
          </span>
        </div>
        <p
          className="text-base italic leading-relaxed"
          style={{
            fontFamily: 'Fraunces, serif',
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
        className="mb-4 font-display text-lg font-semibold"
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
                className="mb-2 text-[0.625rem] font-bold uppercase tracking-[0.16em]"
                style={{ color: 'var(--cerebro-accent)' }}
              >
                {group.label.name}
              </p>
              <ul className="flex flex-col gap-2.5">
                {group.questions.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-start gap-2.5 text-[0.95rem] leading-relaxed"
                    style={{
                      fontFamily: 'Fraunces, serif',
                      color: 'var(--cerebro-fg)',
                    }}
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: 'var(--cerebro-accent)' }}
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !noteId) return;

    setUploading(true);
    try {
      // 1) sobe o arquivo pro disco do servidor → URL; 2) grava o Attachment.
      const url = await uploadAttachmentFile(file);
      const attachment = await attachFileToNote(noteId, {
        url,
        type: 'image',
        mimeType: file.type || undefined,
        name: file.name,
        size: file.size,
      });
      onAttached(attachment);
    } catch {
      // falha de upload é não-crítica — o usuário pode tentar de novo
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2
        className="mb-4 font-display text-lg font-semibold"
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
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] py-3.5 text-sm font-semibold transition-all duration-150 hover:bg-[var(--cerebro-accent-soft)] disabled:opacity-50"
            style={{
              border: '1.5px dashed var(--cerebro-border-strong)',
              color: 'var(--cerebro-accent)',
            }}
          >
            <ImagePlus size={17} strokeWidth={1.85} />
            {uploading ? '…' : t('editor.attach.add')}
          </button>

          {attachments.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {attachments.map((att) => (
                <img
                  key={att.id}
                  src={att.url}
                  alt={att.name ?? 'Anexo'}
                  className="aspect-square w-full rounded-xl object-cover"
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
    saving: {
      dotClass: 'animate-pulse',
      dotColor: 'var(--cerebro-accent)',
      textKey: 'editor.status.saving',
    },
    saved: {
      dotClass: '',
      dotColor: 'var(--cerebro-success)',
      textKey: 'editor.status.saved',
    },
    queued: {
      dotClass: '',
      dotColor: 'var(--cerebro-accent)',
      textKey: 'editor.status.queued',
    },
    error: {
      dotClass: '',
      dotColor: 'var(--cerebro-error)',
      textKey: 'editor.status.error',
    },
  } as const;

  const cfg = configs[status];

  return (
    <div
      className="flex items-center gap-1.5 pr-1 text-[0.6875rem] font-medium transition-opacity duration-200"
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
