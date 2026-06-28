import type {
  PublicationFormatInput,
  PublicationResponse,
  PublicationStageInput,
} from '@cerebro/shared';
import {
  archivePublication,
  createNote,
  editNote,
  editPublication,
  getNoteById,
  listPublications,
  textToDoc,
} from '@cerebro/shared/client';
import { BottomSheet, Button, Card, EmptyState } from '@cerebro/ui';
import { ArrowRight, FileText, Megaphone, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { type PromptRequest, PromptSheet } from '../components/PromptSheet.js';

type FormatFilter = 'all' | PublicationFormatInput;

const FORMAT_OPTIONS: PublicationFormatInput[] = [
  'linkedin',
  'substack',
  'blog',
  'lesson',
  'video',
];

const STAGES: PublicationStageInput[] = ['idea', 'draft', 'published'];

// O funil só avança: idea → draft → published. Publicado é o fim da linha.
const NEXT_STAGE: Record<PublicationStageInput, PublicationStageInput | null> =
  {
    idea: 'draft',
    draft: 'published',
    published: null,
  };

export function PublicationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [publications, setPublications] = useState<PublicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [editing, setEditing] = useState<PublicationResponse | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [promptReq, setPromptReq] = useState<PromptRequest | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listPublications()
      .then((data) => {
        if (!cancelled) setPublications(data);
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
  }, []);

  async function reload() {
    const data = await listPublications();
    setPublications(data);
  }

  async function advance(pub: PublicationResponse) {
    const next = NEXT_STAGE[pub.stage];
    if (!next) return;
    setBusyId(pub.id);
    try {
      await editPublication(pub.id, { stage: next });
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  // Editar rascunho: semeia uma Note vazia e auto-vincula na primeira vez (padrão 65b),
  // depois abre o editor TipTap.
  async function openDraft(pub: PublicationResponse) {
    let noteId = pub.noteId;
    if (!noteId) {
      const note = await createNote({
        type: 'NOTE',
        doc: { type: 'doc', content: [] },
        title: pub.title,
      });
      await editPublication(pub.id, { noteId: note.id });
      noteId = note.id;
    }
    navigate(`/editor/${noteId}`);
  }

  // Rascunhar com IA (modo cheap): usa o texto do rascunho (se houver) como fonte,
  // senão o próprio título. Monta o prompt para copiar — não toca em dado (§9).
  async function openAiDraft(pub: PublicationResponse) {
    const sourceText = pub.noteId
      ? (await getNoteById(pub.noteId)).plainText || pub.title
      : pub.title;
    setPromptReq({
      skill: 'publish.draft',
      context: { format: pub.format, sourceText },
      // Resultado colado vira o rascunho da publicação (Note), aberto no editor (§9).
      apply: async (text) => {
        const doc = textToDoc(text);
        let noteId = pub.noteId;
        if (noteId) {
          await editNote(noteId, { doc });
        } else {
          const note = await createNote({
            type: 'NOTE',
            doc,
            title: pub.title,
          });
          await editPublication(pub.id, { noteId: note.id });
          noteId = note.id;
        }
        await reload();
        navigate(`/editor/${noteId}`);
      },
    });
  }

  async function handleArchive(pub: PublicationResponse) {
    setBusyId(pub.id);
    try {
      await archivePublication(pub.id);
      setEditing(null);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveMeta(
    id: string,
    body: { title: string; format: PublicationFormatInput },
  ) {
    setBusyId(id);
    try {
      await editPublication(id, body);
      setEditing(null);
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  const visible = publications.filter(
    (p) => formatFilter === 'all' || p.format === formatFilter,
  );

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <h1
        className="mb-4 font-display text-[1.75rem] font-semibold leading-tight"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('publish.title')}
      </h1>

      {/* Filtro por formato */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(['all', ...FORMAT_OPTIONS] as FormatFilter[]).map((f) => {
          const active = f === formatFilter;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFormatFilter(f)}
              data-testid={`format-filter-${f}`}
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
              {f === 'all' ? t('publish.filter.all') : t(`publish.format.${f}`)}
            </button>
          );
        })}
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.loading')}
        </p>
      )}
      {error && !loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('publish.error')}
        </p>
      )}
      {!loading && !error && publications.length === 0 && (
        <EmptyState
          icon={<Megaphone size={20} strokeWidth={1.75} />}
          title={t('publish.empty')}
        />
      )}

      {!loading && !error && publications.length > 0 && (
        <div className="space-y-6" data-testid="publications-pipeline">
          {STAGES.map((stage) => {
            const items = visible.filter((p) => p.stage === stage);
            return (
              <section key={stage} data-testid={`pipeline-${stage}`}>
                <h2
                  className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--cerebro-muted)' }}
                >
                  {t(`publish.stage.${stage}`)}
                </h2>
                {items.length === 0 ? (
                  <p
                    className="text-xs"
                    style={{ color: 'var(--cerebro-muted)' }}
                  >
                    {t('publish.stage.empty')}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {items.map((pub) => (
                      <PublicationCard
                        key={pub.id}
                        publication={pub}
                        busy={busyId === pub.id}
                        locale={i18n.language}
                        onAdvance={() => void advance(pub)}
                        onEditDraft={() => void openDraft(pub)}
                        onEditMeta={() => setEditing(pub)}
                        onAiDraft={() => void openAiDraft(pub)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <BottomSheet open={editing !== null} onClose={() => setEditing(null)}>
        {editing && (
          <PublicationEditForm
            publication={editing}
            busy={busyId === editing.id}
            onSave={(body) => void handleSaveMeta(editing.id, body)}
            onArchive={() => void handleArchive(editing)}
          />
        )}
      </BottomSheet>

      <PromptSheet request={promptReq} onClose={() => setPromptReq(null)} />
    </main>
  );
}

function PublicationCard({
  publication,
  busy,
  locale,
  onAdvance,
  onEditDraft,
  onEditMeta,
  onAiDraft,
}: {
  publication: PublicationResponse;
  busy: boolean;
  locale: string;
  onAdvance: () => void;
  onEditDraft: () => void;
  onEditMeta: () => void;
  onAiDraft: () => void;
}) {
  const { t } = useTranslation();
  const next = NEXT_STAGE[publication.stage];

  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onEditMeta}
          data-testid={`publication-${publication.id}`}
          className="flex min-w-0 flex-1 items-start gap-3 text-left transition-transform duration-150 active:scale-[0.99]"
        >
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'var(--cerebro-accent-soft)',
              color: 'var(--cerebro-accent)',
            }}
            aria-hidden
          >
            <Megaphone size={18} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {publication.title}
            </p>
            <p
              className="mt-0.5 truncate text-xs"
              style={{ color: 'var(--cerebro-muted)' }}
            >
              {t(`publish.format.${publication.format}`)} ·{' '}
              {t(`publish.source.${publication.sourceType}`)}
            </p>
            {publication.publishedAt && (
              <p
                className="mt-0.5 text-[0.6875rem] font-semibold"
                style={{ color: 'var(--cerebro-accent)' }}
              >
                {t('publish.publishedOn', {
                  date: new Date(publication.publishedAt).toLocaleDateString(
                    locale,
                    { day: 'numeric', month: 'short' },
                  ),
                })}
              </p>
            )}
          </div>
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onEditDraft}
          disabled={busy}
          data-testid={`edit-draft-${publication.id}`}
        >
          <FileText size={14} strokeWidth={1.85} />
          {t('publish.action.editDraft')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onAiDraft}
          disabled={busy}
          data-testid={`ai-draft-${publication.id}`}
        >
          <Sparkles size={14} strokeWidth={1.85} />
          {t('ai.skill.publish.draft')}
        </Button>
        {next && (
          <Button
            size="sm"
            onClick={onAdvance}
            disabled={busy}
            data-testid={`advance-${publication.id}`}
          >
            <ArrowRight size={14} strokeWidth={2} />
            {next === 'draft'
              ? t('publish.action.toDraft')
              : t('publish.action.toPublished')}
          </Button>
        )}
      </div>
    </Card>
  );
}

function PublicationEditForm({
  publication,
  busy,
  onSave,
  onArchive,
}: {
  publication: PublicationResponse;
  busy: boolean;
  onSave: (body: { title: string; format: PublicationFormatInput }) => void;
  onArchive: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(publication.title);
  const [format, setFormat] = useState<PublicationFormatInput>(
    publication.format,
  );
  const trimmed = title.trim();

  return (
    <div className="flex flex-col gap-4">
      <h2
        className="font-display text-lg font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('publish.edit.title')}
      </h2>

      <label className="flex flex-col gap-1.5">
        <span
          className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {t('publish.field.title')}
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="publication-title-input"
          className="h-11 rounded-[var(--radius-card)] px-3 text-sm outline-none"
          style={{
            backgroundColor: 'var(--cerebro-raised)',
            color: 'var(--cerebro-fg)',
            border: '1px solid var(--cerebro-border)',
          }}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span
          className="text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {t('publish.field.format')}
        </span>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as PublicationFormatInput)}
          data-testid="publication-format-select"
          className="h-11 rounded-[var(--radius-card)] px-3 text-sm outline-none"
          style={{
            backgroundColor: 'var(--cerebro-raised)',
            color: 'var(--cerebro-fg)',
            border: '1px solid var(--cerebro-border)',
          }}
        >
          {FORMAT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {t(`publish.format.${f}`)}
            </option>
          ))}
        </select>
      </label>

      <Button
        onClick={() => onSave({ title: trimmed, format })}
        disabled={busy || trimmed.length === 0}
        data-testid="publication-save"
      >
        {t('publish.save')}
      </Button>
      <Button
        variant="ghost"
        onClick={onArchive}
        disabled={busy}
        data-testid="publication-archive"
      >
        {t('publish.action.archive')}
      </Button>
    </div>
  );
}
