import type {
  RecallConfidenceInput,
  RecallResponse,
  StudyItemResponse,
} from '@cerebro/shared';
import {
  archiveStudyItem,
  createNote,
  editStudyItem,
  getStudyItem,
  logRecall,
  undoRecall,
} from '@cerebro/shared/client';
import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Brain, FileText, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useTabs } from '../tabs/tabs-context.js';
import { useActiveStudy } from './active-study-context.js';
import { durabilityKey, isDue, studyItemLabel } from './study-display.js';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const CONFIDENCES = ['A', 'B', 'C'] as const;

/** Cada linha não-vazia do textarea vira uma pergunta (mesma regra do mobile). */
function toLines(value?: string): string[] {
  return (value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

const studyFormSchema = z.object({
  title: z.string().trim().min(1),
  reference: z.string().optional(),
  before: z.string().optional(),
  during: z.string().optional(),
  after: z.string().optional(),
});
type StudyFormValues = z.infer<typeof studyFormSchema>;

/**
 * Aba de detalhe/edição de um item de estudo (Leitura Retentiva) no desktop.
 * Carrega o item por id (com o `schedule` CALCULADO pelo backend — nunca
 * recalculado aqui), mostra o recurso vinculado (abre a aba dele), a
 * durabilidade, as perguntas antes/durante/depois e o FICHAMENTO (uma Note
 * STUDY_NOTE escrita de memória — reusa o editor de notas abrindo `{kind:'note'}`).
 * Permite editar via react-hook-form + zodResolver. Apresenta o ritual de
 * RECUPERAÇÃO ATIVA quando o item está devido (ou via "Revisar"): tente lembrar
 * primeiro → A/B/C (`logRecall`) → mostra a próxima revisão (resposta do backend)
 * → desfazer (`undoRecall`). A/B/C é metadado de priorização, NÃO o intervalo.
 * Renomeia a própria aba quando o título carrega/muda e publica o item no
 * `ActiveStudyContext` para o painel direito ler. Espelha a `StudyItemsPage` do
 * mobile reusando os mesmos endpoints do shared.
 */
export function StudyItemDetailTab({ studyItemId }: { studyItemId: string }) {
  const { t } = useTranslation();
  const { openTab, renameTab, tabs } = useTabs();
  const { set, clear } = useActiveStudy();

  const [item, setItem] = useState<StudyItemResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [reviewing, setReviewing] = useState(false);
  const [recalling, setRecalling] = useState(false);
  const [lastRecall, setLastRecall] = useState<RecallResponse | null>(null);
  // Confianças A/B/C registradas nesta sessão (a API não expõe o log de recalls).
  const [confidences, setConfidences] = useState<RecallConfidenceInput[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudyFormValues>({ resolver: zodResolver(studyFormSchema) });

  const load = useCallback(async () => {
    const fresh = await getStudyItem(studyItemId);
    setItem(fresh);
    reset({
      title: fresh.title,
      reference: fresh.reference ?? undefined,
      before: (fresh.questions?.before ?? []).join('\n'),
      during: (fresh.questions?.during ?? []).join('\n'),
      after: (fresh.questions?.after ?? []).join('\n'),
    });
    return fresh;
  }, [studyItemId, reset]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    load()
      .then((fresh) => {
        if (!cancelled && isDue(fresh.schedule)) setReviewing(true);
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
  }, [load]);

  // Publica o item ativo (+ confianças desta sessão) para o painel direito ler.
  useEffect(() => {
    if (item) set(studyItemId, { item, confidences });
  }, [item, confidences, studyItemId, set]);

  useEffect(() => () => clear(studyItemId), [studyItemId, clear]);

  // Renomeia a própria aba com o título de verdade quando ele muda (no-op se igual).
  useEffect(() => {
    if (!item) return;
    const own = tabs.find(
      (tab) =>
        tab.descriptor.kind === 'studyItem' &&
        tab.descriptor.id === studyItemId,
    );
    if (own) {
      renameTab(own.tabId, studyItemLabel(item, t('study.fromResource')));
    }
  }, [item, tabs, studyItemId, renameTab, t]);

  const recordConfidence = useCallback((confidence: RecallConfidenceInput) => {
    setConfidences((prev) => [...prev, confidence]);
  }, []);

  const undoConfidence = useCallback(() => {
    setConfidences((prev) => prev.slice(0, -1));
  }, []);

  const save = handleSubmit(async (values) => {
    if (!item) return;
    setSaveStatus('saving');
    try {
      const before = toLines(values.before);
      const during = toLines(values.during);
      const after = toLines(values.after);
      const updated = await editStudyItem(studyItemId, {
        title: values.title.trim(),
        reference: values.reference?.trim() || null,
        questions: { before, during, after },
      });
      setItem(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  });

  // Fichamento de memória (Práticas 1/6): cria uma STUDY_NOTE e vincula ao item
  // na 1ª vez; depois apenas reabre no editor de notas (reuso do fluxo de nota).
  const openFichamento = useCallback(async () => {
    if (!item) return;
    let noteId = item.fichamentoNoteId;
    if (!noteId) {
      const note = await createNote({
        type: 'STUDY_NOTE',
        doc: { type: 'doc', content: [] },
        resourceId: item.resourceId ?? undefined,
        title: item.title,
      });
      const updated = await editStudyItem(item.id, {
        fichamentoNoteId: note.id,
      });
      setItem(updated);
      noteId = note.id;
    }
    openTab({ kind: 'note', id: noteId, title: item.title });
  }, [item, openTab]);

  const handleRecall = useCallback(
    async (confidence: RecallConfidenceInput) => {
      if (!item) return;
      setRecalling(true);
      try {
        const recall = await logRecall(item.id, { confidence });
        setLastRecall(recall);
        recordConfidence(confidence);
        // Recarrega o item para puxar o `schedule` recalculado pelo backend.
        await load();
        setReviewing(false);
      } finally {
        setRecalling(false);
      }
    },
    [item, recordConfidence, load],
  );

  const handleUndoRecall = useCallback(async () => {
    if (!lastRecall) return;
    setRecalling(true);
    try {
      await undoRecall(lastRecall.id);
      setLastRecall(null);
      undoConfidence();
      await load();
    } finally {
      setRecalling(false);
    }
  }, [lastRecall, undoConfidence, load]);

  const archive = useCallback(async () => {
    if (!item) return;
    try {
      const updated = await archiveStudyItem(item.id);
      setItem(updated);
    } catch {
      setSaveStatus('error');
    }
  }, [item]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('agenda.loading')}</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('study.error')}</p>
      </div>
    );
  }

  const due = isDue(item.schedule);
  const archived = item.status === 'ARCHIVED';

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col overflow-y-auto px-6 py-6">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-subtle px-3 py-1 text-xs font-semibold text-muted">
            {t(`study.durability.${durabilityKey(item)}`)}
          </span>
          <SaveIndicator status={saveStatus} t={t} />
        </div>

        <Input
          label={t('study.field.title')}
          error={errors.title ? t('study.field.titleRequired') : undefined}
          {...register('title')}
        />
        <Input label={t('study.field.reference')} {...register('reference')} />

        {item.resourceId && (
          <button
            type="button"
            onClick={() =>
              openTab({
                kind: 'resource',
                id: item.resourceId as string,
                title: t('study.fromResource'),
              })
            }
            className="flex items-center gap-2 self-start rounded px-2 py-1 text-sm text-accent transition-colors hover:underline"
          >
            <BookOpen size={15} strokeWidth={1.75} aria-hidden />
            {t('study.detail.openResource')}
          </button>
        )}

        <Textarea
          label={t('study.field.questionsBefore')}
          {...register('before')}
        />
        <Textarea
          label={t('study.field.questionsDuring')}
          {...register('during')}
        />
        <Textarea
          label={t('study.field.questionsAfter')}
          {...register('after')}
        />

        <Button
          type="submit"
          disabled={saveStatus === 'saving'}
          className="mt-1"
        >
          {saveStatus === 'saving' ? t('capture.submitting') : t('common.save')}
        </Button>
      </form>

      {/* Fichamento de memória — duas fases (Práticas 1/6) */}
      <section className="mt-8">
        <h2 className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {t('study.detail.fichamento')}
        </h2>
        {!item.fichamentoNoteId ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm leading-relaxed text-muted">
              {t('study.fichamento.blindHint')}
            </p>
            <Button
              variant="secondary"
              onClick={() => void openFichamento()}
              data-testid="write-fichamento"
              className="self-start"
            >
              <FileText size={16} strokeWidth={1.85} />
              {t('study.fichamento.phase1')}
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={() => void openFichamento()}
            data-testid="view-fichamento"
            className="self-start"
          >
            <FileText size={16} strokeWidth={1.85} />
            {t('study.fichamento.view')}
          </Button>
        )}
      </section>

      {/* Recuperação ativa (Práticas 3/7) — o ritual de revisão */}
      {!archived && (
        <section className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
              {t('study.detail.recall')}
            </h2>
            {!item.schedule.consolidated && !reviewing && (
              <Button
                size="sm"
                onClick={() => setReviewing(true)}
                data-testid="start-review"
              >
                <Brain size={15} strokeWidth={1.85} />
                {t('study.review')}
              </Button>
            )}
          </div>

          {item.schedule.consolidated ? (
            <p className="text-sm text-muted">
              {t('study.detail.consolidatedHint')}
            </p>
          ) : reviewing ? (
            <RecallRitual
              item={item}
              recalling={recalling}
              onRecall={(c) => void handleRecall(c)}
              onCancel={() => setReviewing(false)}
            />
          ) : (
            <p className="text-sm text-muted">
              {due
                ? t('study.schedule.dueToday')
                : t('study.detail.notDueHint')}
            </p>
          )}

          {lastRecall && (
            <div className="mt-3 flex items-center justify-between rounded-[var(--radius-card)] border border-subtle bg-raised px-3 py-2">
              <span className="text-xs text-muted">
                {t('study.detail.recallLogged', {
                  confidence: t(`review.confidence.${lastRecall.confidence}`),
                })}
              </span>
              <button
                type="button"
                onClick={() => void handleUndoRecall()}
                disabled={recalling}
                data-testid="undo-recall"
                className="flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:underline disabled:opacity-50"
              >
                <RotateCcw size={13} strokeWidth={2} />
                {t('study.detail.undoRecall')}
              </button>
            </div>
          )}
        </section>
      )}

      {!archived && (
        <div className="mt-8">
          <Button variant="secondary" onClick={() => void archive()}>
            {t('common.archive')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Ritual de recuperação ativa ───────────────────────────────────────────────

/**
 * O ritual de revisão, EXATAMENTE como no mobile: primeiro "tente lembrar antes
 * de reler" + perguntas + prompts de contexto episódico fixos; só então o
 * usuário avalia A/B/C. A próxima revisão vem da resposta do backend (escada
 * fixa) — nada é computado aqui. A/B/C é metadado de priorização, não o intervalo.
 */
function RecallRitual({
  item,
  recalling,
  onRecall,
  onCancel,
}: {
  item: StudyItemResponse;
  recalling: boolean;
  onRecall: (confidence: RecallConfidenceInput) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const questions = item.questions
    ? [...item.questions.before, ...item.questions.after]
    : [];
  const contextPrompts = [
    t('review.context.where'),
    t('review.context.against'),
    t('review.context.transition'),
  ];

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-subtle bg-raised p-4">
      <div>
        <p className="text-sm font-medium text-accent">
          {t('review.tryRecall')}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {t('review.tryRecall.body')}
        </p>
      </div>

      {questions.length > 0 && (
        <div>
          <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
            {t('review.questions')}
          </h3>
          <ul className="mt-1.5 list-disc pl-5 text-sm text-fg">
            {questions.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {t('review.context')}
        </h3>
        <ul className="mt-1.5 list-disc pl-5 text-sm text-muted">
          {contextPrompts.map((p, idx) => (
            <li key={idx}>{p}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-fg">
          {t('review.howDidItGo')}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {CONFIDENCES.map((c) => (
            <button
              key={c}
              type="button"
              disabled={recalling}
              onClick={() => onRecall(c)}
              data-testid={`recall-${c}`}
              className="flex flex-col items-center gap-1 rounded-[var(--radius-card)] border border-subtle bg-bg px-2 py-3 text-center text-fg transition-transform duration-150 hover:bg-card active:scale-[0.97] disabled:opacity-50"
            >
              <span className="font-display text-lg font-semibold">{c}</span>
              <span className="text-[0.6875rem] text-muted">
                {t(`review.confidence.${c}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="self-start text-xs font-medium text-muted transition-colors hover:underline"
      >
        {t('common.cancel')}
      </button>
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Textarea({
  label,
  ...rest
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg opacity-80">{label}</span>
      <textarea
        className="min-h-[64px] w-full rounded-[var(--radius-card)] border border-subtle bg-raised px-4 py-2.5 text-sm text-fg outline-none"
        {...rest}
      />
    </label>
  );
}

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
