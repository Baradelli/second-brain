import type {
  PublicationFormatInput,
  PublicationResponse,
  PublicationStageInput,
} from '@cerebro/shared';
import {
  archivePublication,
  createNote,
  deletePublication,
  editPublication,
  getPublication,
  unarchivePublication,
} from '@cerebro/shared/client';
import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Check, FileText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { ConfirmDialog } from '../shared/ConfirmDialog.js';
import { useTabs } from '../tabs/tabs-context.js';
import { useActivePublications } from './active-publication-context.js';
import {
  advanceActionKey,
  formatLabelKey,
  nextStage,
  PUBLICATION_FORMATS,
  PUBLICATION_STAGES,
  publicationLabel,
  sourceLabelKey,
  stageLabelKey,
} from './publication-display.js';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const publicationFormSchema = z.object({
  title: z.string().trim().min(1),
  format: z.enum(['linkedin', 'substack', 'blog', 'lesson', 'video']),
});
type PublicationFormValues = z.infer<typeof publicationFormSchema>;

/**
 * Aba de detalhe/pipeline de uma publicação no desktop. Carrega a publicação
 * por id, mostra título/formato/fonte e o FUNIL idea→draft→published com as
 * transições (o funil só avança — `nextStage`; publicado é o fim da linha). O
 * rascunho é uma Note: abrimos/editamos reusando o editor de notas
 * (`openTab({kind:'note'})`), criando e auto-vinculando a nota na 1ª vez
 * (modelo do mobile). Edição de metadados via react-hook-form + zodResolver com
 * o schema do shared. Renomeia a própria aba quando o título carrega/muda e
 * publica a publicação no `ActivePublicationsContext` para o painel direito ler.
 * Espelha a `PublicationsPage` do mobile reusando os mesmos endpoints do shared.
 */
export function PublicationDetailTab({
  publicationId,
}: {
  publicationId: string;
}) {
  const { t } = useTranslation();
  const { openTab, renameTab, closeTab, tabs } = useTabs();
  const { set, clear } = useActivePublications();
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);

  const [publication, setPublication] = useState<PublicationResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [advancing, setAdvancing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PublicationFormValues>({
    resolver: zodResolver(publicationFormSchema),
  });

  const load = useCallback(async () => {
    const fresh = await getPublication(publicationId);
    setPublication(fresh);
    reset({ title: fresh.title, format: fresh.format });
    return fresh;
  }, [publicationId, reset]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    load()
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Publica a publicação ativa para o painel direito ler.
  useEffect(() => {
    if (publication) set(publicationId, { publication });
  }, [publication, publicationId, set]);

  useEffect(() => () => clear(publicationId), [publicationId, clear]);

  // Renomeia a própria aba com o título de verdade quando ele muda (no-op se igual).
  useEffect(() => {
    if (!publication) return;
    const own = tabs.find(
      (tab) =>
        tab.descriptor.kind === 'publication' &&
        tab.descriptor.id === publicationId,
    );
    if (own) {
      renameTab(
        own.tabId,
        publicationLabel(publication, t('publish.create.title')),
      );
    }
  }, [publication, tabs, publicationId, renameTab, t]);

  const save = handleSubmit(async (values) => {
    if (!publication) return;
    setSaveStatus('saving');
    try {
      const updated = await editPublication(publicationId, {
        title: values.title.trim(),
        format: values.format as PublicationFormatInput,
      });
      setPublication(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  });

  // Avança o funil para a próxima etapa (idea→draft→published). O funil só
  // avança; a tela nunca recomputa a ordem — vem da forma pura `nextStage`.
  const advance = useCallback(async () => {
    if (!publication) return;
    const next = nextStage(publication.stage);
    if (!next) return;
    setAdvancing(true);
    try {
      const updated = await editPublication(publication.id, { stage: next });
      setPublication(updated);
    } finally {
      setAdvancing(false);
    }
  }, [publication]);

  // Editar rascunho: cria uma Note vazia e auto-vincula na 1ª vez (modelo do
  // mobile), depois reabre no editor de notas (reuso do fluxo de nota).
  const openDraft = useCallback(async () => {
    if (!publication) return;
    let noteId = publication.noteId;
    if (!noteId) {
      const note = await createNote({
        type: 'NOTE',
        doc: { type: 'doc', content: [] },
        title: publication.title,
      });
      const updated = await editPublication(publication.id, {
        noteId: note.id,
      });
      setPublication(updated);
      noteId = note.id;
    }
    openTab({ kind: 'note', id: noteId, title: publication.title });
  }, [publication, openTab]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('agenda.loading')}</p>
      </div>
    );
  }

  if (error || !publication) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('publish.error')}</p>
      </div>
    );
  }

  const archived = publication.status === 'ARCHIVED';
  const advanceKey = advanceActionKey(publication.stage);

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col overflow-y-auto px-6 py-6">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-subtle px-3 py-1 text-xs font-semibold text-muted">
            {t(sourceLabelKey(publication.sourceType))}
          </span>
          <SaveIndicator status={saveStatus} t={t} />
        </div>

        <Input
          label={t('publish.field.title')}
          error={errors.title ? t('publish.field.titleRequired') : undefined}
          {...register('title')}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg opacity-80">
            {t('publish.field.format')}
          </span>
          <select
            className="h-11 w-full rounded-[var(--radius-card)] border border-subtle bg-raised px-4 text-sm text-fg outline-none"
            {...register('format')}
          >
            {PUBLICATION_FORMATS.map((f) => (
              <option key={f} value={f}>
                {t(formatLabelKey(f))}
              </option>
            ))}
          </select>
        </label>

        <Button
          type="submit"
          disabled={saveStatus === 'saving'}
          className="mt-1"
        >
          {saveStatus === 'saving' ? t('capture.submitting') : t('common.save')}
        </Button>
      </form>

      {/* Funil idea → draft → published */}
      <section className="mt-8">
        <h2 className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {t('publish.detail.pipeline')}
        </h2>
        <Pipeline stage={publication.stage} />
        {!archived && advanceKey && (
          <Button
            size="sm"
            onClick={() => void advance()}
            disabled={advancing}
            data-testid="advance-stage"
            className="mt-3"
          >
            <ArrowRight size={15} strokeWidth={2} />
            {t(advanceKey)}
          </Button>
        )}
      </section>

      {/* Rascunho — uma Note, reusando o editor de notas */}
      <section className="mt-8">
        <h2 className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {t('publish.detail.draft')}
        </h2>
        <div className="flex flex-col gap-1.5">
          {!publication.noteId && (
            <p className="text-sm leading-relaxed text-muted">
              {t('publish.detail.draftHint')}
            </p>
          )}
          <Button
            variant="secondary"
            onClick={() => void openDraft()}
            data-testid={publication.noteId ? 'open-draft' : 'create-draft'}
            className="self-start"
          >
            <FileText size={16} strokeWidth={1.85} />
            {publication.noteId
              ? t('publish.draft.open')
              : t('publish.draft.create')}
          </Button>
        </div>
      </section>

      {!archived && (
        <div className="mt-8">
          <Button variant="secondary" onClick={() => setConfirm('archive')}>
            {t('common.archive')}
          </Button>
        </div>
      )}

      {archived && (
        <div className="mt-8 flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() =>
              void unarchivePublication(publication.id)
                .then(setPublication)
                .catch(() => {})
            }
          >
            {t('common.restore')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setConfirm('delete')}
            style={{ color: 'var(--cerebro-error)' }}
          >
            {t('common.deletePermanently')}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirm === 'archive'}
        tone="default"
        title={t('publications.archiveConfirm.title')}
        body={t('publications.archiveConfirm.body')}
        confirmLabel={t('publications.archiveConfirm.confirm')}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          const updated = await archivePublication(publication.id);
          setPublication(updated);
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        tone="danger"
        title={t('publications.deleteConfirm.title')}
        body={t('publications.deleteConfirm.body')}
        confirmLabel={t('publications.deleteConfirm.confirm')}
        blockedMessage={t('publications.deleteBlocked')}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await deletePublication(publication.id);
          setConfirm(null);
          const own = tabs.find(
            (tab) =>
              tab.descriptor.kind === 'publication' &&
              tab.descriptor.id === publicationId,
          );
          if (own) closeTab(own.tabId);
        }}
      />
    </div>
  );
}

// ── Funil visual ──────────────────────────────────────────────────────────────

/**
 * O funil idea→draft→published desenhado em linha: etapas já alcançadas
 * (incluindo a atual) ficam destacadas; as futuras, esmaecidas. Só EXIBE — a
 * ordem das etapas vem da forma pura `PUBLICATION_STAGES`, sem recomputar nada.
 */
function Pipeline({ stage }: { stage: PublicationStageInput }) {
  const { t } = useTranslation();
  const currentIndex = PUBLICATION_STAGES.indexOf(stage);

  return (
    <ol className="flex items-stretch gap-2" data-testid="pipeline">
      {PUBLICATION_STAGES.map((s, idx) => {
        const reached = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <li
            key={s}
            className={`flex flex-1 flex-col gap-1 rounded-[var(--radius-card)] border px-3 py-2 ${
              reached
                ? 'border-accent bg-raised text-fg'
                : 'border-subtle bg-bg text-faint'
            }`}
            data-testid={`pipeline-stage-${s}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              {isCurrent && (
                <Check size={14} strokeWidth={2.25} className="text-accent" />
              )}
              {t(stageLabelKey(s))}
            </span>
            {isCurrent && (
              <span className="text-[0.625rem] uppercase tracking-[0.12em] text-accent">
                {t('publish.stage.current')}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SaveIndicator({
  status,
  t,
}: {
  status: SaveStatus;
  t: (key: string) => string;
}) {
  if (status === 'idle') return <div className="h-4 w-20" aria-hidden />;

  const configs = {
    saving: { color: 'var(--cerebro-accent)', textKey: 'editor.status.saving' },
    saved: { color: 'var(--cerebro-success)', textKey: 'editor.status.saved' },
    error: { color: 'var(--cerebro-error)', textKey: 'editor.status.error' },
  } as const;
  const cfg = configs[status];

  return (
    <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium text-muted">
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === 'saving' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: cfg.color }}
        aria-hidden
      />
      <span>{t(cfg.textKey)}</span>
    </div>
  );
}
