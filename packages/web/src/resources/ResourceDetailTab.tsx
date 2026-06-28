import type {
  NoteResponse,
  NoteType,
  ResourceResponse,
  StudyItemResponse,
} from '@cerebro/shared';
import {
  editResource,
  flattenLabels,
  getResource,
  listLabels,
  listNotes,
  listStudyItems,
} from '@cerebro/shared/client';
import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, GraduationCap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useTabs } from '../tabs/tabs-context.js';
import { useActiveResources } from './active-resource-context.js';
import { nextStage, resourceLabel } from './resource-display.js';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const RESOURCE_TYPES = [
  'book',
  'course',
  'video',
  'article',
  'podcast',
  'other',
] as const;

const NOTE_COLOR: Record<NoteType, string> = {
  DEVOTIONAL: 'var(--cerebro-devotional)',
  REFLECTION: 'var(--cerebro-reflection)',
  STUDY_NOTE: 'var(--cerebro-study)',
  NOTE: 'var(--cerebro-note)',
};

const resourceFormSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(RESOURCE_TYPES),
  author: z.string().optional(),
  url: z.string().optional(),
});
type ResourceFormValues = z.infer<typeof resourceFormSchema>;

function notePreview(note: NoteResponse): string {
  if (note.title?.trim()) return note.title.trim();
  return (
    note.plainText
      .split('\n')
      .find((l) => l.trim())
      ?.trim() ?? ''
  );
}

/**
 * Aba de detalhe/edição de um recurso (Biblioteca) no desktop. Carrega o recurso
 * por id (e seus fichamentos/itens de estudo vinculados), permite editar
 * título/tipo/autor/url + labels via react-hook-form, salva com `editResource`,
 * e avança o stage no ciclo do mobile (backlog → in_progress → done). Renomeia a
 * própria aba quando o título carrega/muda (igual ao `NoteEditorTab`) e publica o
 * recurso no `ActiveResourcesContext` para o painel direito ler. Espelha a
 * `ResourceDetailPage` do mobile reusando os mesmos endpoints.
 */
export function ResourceDetailTab({ resourceId }: { resourceId: string }) {
  const { t } = useTranslation();
  const { openTab, renameTab, tabs } = useTabs();
  const { set, clear } = useActiveResources();

  const [resource, setResource] = useState<ResourceResponse | null>(null);
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [studyItems, setStudyItems] = useState<StudyItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [labelIds, setLabelIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
  });

  // Carrega o recurso + fichamentos + itens de estudo vinculados.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      getResource(resourceId),
      listNotes({ resourceId }),
      listStudyItems({ resourceId }),
    ])
      .then(([r, ns, items]) => {
        if (cancelled) return;
        setResource(r);
        setNotes(ns);
        setStudyItems(items);
        setLabelIds(r.labelIds);
        reset({
          title: r.title,
          type: r.type,
          author: r.author ?? undefined,
          url: r.url ?? undefined,
        });
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
  }, [resourceId, reset]);

  // Publica o recurso ativo (+ contagem de fichamentos) para o painel direito.
  useEffect(() => {
    if (resource) set(resourceId, { resource, noteCount: notes.length });
  }, [resource, notes.length, resourceId, set]);

  // Limpa o estado vivo ao desmontar a aba.
  useEffect(() => () => clear(resourceId), [resourceId, clear]);

  // Renomeia a própria aba com o título de verdade quando ele muda (no-op se igual).
  useEffect(() => {
    if (!resource) return;
    const own = tabs.find(
      (tab) =>
        tab.descriptor.kind === 'resource' && tab.descriptor.id === resourceId,
    );
    if (own) {
      renameTab(own.tabId, resourceLabel(resource, t('library.untitled')));
    }
  }, [resource, tabs, resourceId, renameTab, t]);

  const save = handleSubmit(async (values) => {
    setSaveStatus('saving');
    try {
      const updated = await editResource(resourceId, {
        title: values.title.trim(),
        type: values.type,
        author: values.author?.trim() || null,
        url: values.url?.trim() || null,
        labelIds,
      });
      setResource(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  });

  const advanceStage = useCallback(async () => {
    if (!resource) return;
    const next = nextStage(resource.stage);
    try {
      const updated = await editResource(resourceId, { stage: next });
      setResource(updated);
    } catch {
      setSaveStatus('error');
    }
  }, [resource, resourceId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('agenda.loading')}</p>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('library.error')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col overflow-y-auto px-6 py-6">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => void advanceStage()}
            className="rounded-full border border-subtle px-3 py-1 text-xs font-semibold text-muted transition-colors hover:bg-card"
          >
            {t(`resource.stage.${resource.stage}`)}
          </button>
          <SaveIndicator status={saveStatus} t={t} />
        </div>

        <Input
          label={t('resource.field.title')}
          error={errors.title ? t('library.create.titleRequired') : undefined}
          {...register('title')}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-fg opacity-80">
            {t('resource.field.type')}
          </span>
          <select
            className="h-11 w-full rounded-[var(--radius-card)] border border-subtle bg-raised px-4 text-sm text-fg outline-none"
            {...register('type')}
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`resource.type.${type}`)}
              </option>
            ))}
          </select>
        </label>

        <Input label={t('resource.field.author')} {...register('author')} />
        <Input label={t('resource.field.url')} {...register('url')} />

        <LabelSelect value={labelIds} onChange={setLabelIds} />

        <Button
          type="submit"
          disabled={saveStatus === 'saving'}
          className="mt-1"
        >
          {saveStatus === 'saving' ? t('capture.submitting') : t('common.save')}
        </Button>
      </form>

      {/* Fichamentos vinculados */}
      <section className="mt-8">
        <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {t('resource.notes.title')}
        </h2>
        {notes.length === 0 ? (
          <p className="text-xs text-muted">{t('resource.notes.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() =>
                    openTab({
                      kind: 'note',
                      id: note.id,
                      title: notePreview(note) || t('notes.untitled'),
                    })
                  }
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card"
                >
                  <span
                    className="h-3.5 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: NOTE_COLOR[note.type] }}
                    aria-hidden
                  />
                  <FileText
                    size={14}
                    strokeWidth={1.75}
                    className="shrink-0 text-faint"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">
                    {notePreview(note) || t('notes.untitled')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Itens de estudo vinculados (a aba de estudo chega na Fase 2.3) */}
      {studyItems.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
            {t('resource.studyItems.title')}
          </h2>
          <ul className="flex flex-col gap-1">
            {studyItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    openTab({
                      kind: 'studyItem',
                      id: item.id,
                      title: item.title,
                    })
                  }
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card"
                >
                  <GraduationCap
                    size={14}
                    strokeWidth={1.75}
                    className="shrink-0 text-faint"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">
                    {item.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
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

/**
 * Multi-seleção compacta de labels: lista as labels existentes (achatadas) como
 * chips alternáveis. Reusa `listLabels`/`flattenLabels` do shared — não há um
 * `LabelPicker` no web ainda, e este caso é simples o bastante para ser inline.
 */
function LabelSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    listLabels()
      .then((tree) => {
        if (cancelled) return;
        setLabels(flattenLabels(tree).map((l) => ({ id: l.id, name: l.name })));
      })
      .catch(() => {
        if (!cancelled) setLabels([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-fg opacity-80">
        {t('shell.labels')}
      </span>
      {labels.length === 0 ? (
        <p className="text-xs text-muted">{t('resource.labels.empty')}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => {
            const selected = value.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => toggle(label.id)}
                aria-pressed={selected}
                className={`rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium transition-colors ${
                  selected
                    ? 'bg-accent text-fg'
                    : 'border border-subtle text-muted hover:bg-card'
                }`}
              >
                {label.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
