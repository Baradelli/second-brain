import type {
  GoalProgressResponse,
  GoalResponse,
  NoteResponse,
  NoteType,
  PublicationFormatInput,
  PublicationResponse,
  ResourceResponse,
  StudyItemResponse,
} from '@cerebro/shared';
import {
  archiveGoal,
  archiveResource,
  checkGoal,
  createGoal,
  type CreateGoalBody,
  createNote,
  createPublication,
  type CreateResourceBody,
  createStudyItem,
  type CreateStudyItemInput,
  deleteResource,
  editGoal,
  editPublication,
  editResource,
  getGoalProgress,
  getResource,
  listActiveGoals,
  listNotes,
  listResourcePublications,
  listStudyItems,
  unarchiveResource,
} from '@cerebro/shared/client';
import { BottomSheet, Button, GoalForm, ProgressRing, ResourceForm } from '@cerebro/ui';
import {
  Archive,
  BookOpen,
  Check,
  FileText,
  GraduationCap,
  Megaphone,
  Pencil,
  Plus,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  formatLabelKey,
  publicationLabel,
  stageLabelKey,
} from '../publications/publication-display.js';
import { PublicationCreateForm } from '../publications/PublicationCreateForm.js';
import { ConfirmDialog } from '../shared/ConfirmDialog.js';
import { LabelSelect } from '../shared/LabelSelect.js';
import { StudyItemCreateForm } from '../study/StudyItemCreateForm.js';
import { HighlightsSection } from './HighlightsSection.js';
import { useTabs } from '../tabs/tabs-context.js';
import { useActiveResources } from './active-resource-context.js';
import { nextStage, resourceLabel } from './resource-display.js';

type Tab = 'highlights' | 'study' | 'publications';

const NOTE_COLOR: Record<NoteType, string> = {
  DEVOTIONAL: 'var(--cerebro-devotional)',
  REFLECTION: 'var(--cerebro-reflection)',
  STUDY_NOTE: 'var(--cerebro-study)',
  NOTE: 'var(--cerebro-note)',
};

const PUB_STAGE_COLOR: Record<PublicationResponse['stage'], string> = {
  idea: 'var(--cerebro-faint)',
  draft: 'var(--cerebro-accent)',
  published: 'var(--cerebro-success)',
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

function progressPercent(p: GoalProgressResponse | undefined): number {
  const ratio = p?.ratio ?? 0;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

/**
 * Hub do recurso (desktop): cabeçalho + objetivos de leitura (vários; criar/editar/
 * arquivar) + um controle segmentado entre Grifos, Estudo (fichamentos + itens, com
 * criação) e Publicações (as que nasceram deste recurso, com criação). Tudo que se
 * relaciona ao recurso mora aqui. Edição via BottomSheet, no padrão de criação.
 */
export function ResourceDetailTab({ resourceId }: { resourceId: string }) {
  const { t } = useTranslation();
  const { openTab, renameTab, closeTab, tabs } = useTabs();
  const { set, clear } = useActiveResources();

  const [resource, setResource] = useState<ResourceResponse | null>(null);
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [studyItems, setStudyItems] = useState<StudyItemResponse[]>([]);
  const [publications, setPublications] = useState<PublicationResponse[]>([]);
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [goalProgress, setGoalProgress] = useState<
    Record<string, GoalProgressResponse>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('highlights');
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalResponse | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const [creatingStudyItem, setCreatingStudyItem] = useState(false);
  const [creatingPublication, setCreatingPublication] = useState(false);
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);

  const loadGoals = useCallback(async () => {
    const list = await listActiveGoals({ resourceId });
    setGoals(list);
    const entries = await Promise.all(
      list.map(async (g) => [g.id, await getGoalProgress(g.id)] as const),
    );
    setGoalProgress(Object.fromEntries(entries));
  }, [resourceId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      getResource(resourceId),
      listNotes({ resourceId }),
      listStudyItems({ resourceId }),
      listResourcePublications(resourceId),
    ])
      .then(async ([r, ns, items, pubs]) => {
        if (cancelled) return;
        setResource(r);
        setNotes(ns);
        setStudyItems(items);
        setPublications(pubs);
        await loadGoals();
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
  }, [resourceId, loadGoals]);

  useEffect(() => {
    if (resource) set(resourceId, { resource, noteCount: notes.length });
  }, [resource, notes.length, resourceId, set]);
  useEffect(() => () => clear(resourceId), [resourceId, clear]);

  useEffect(() => {
    if (!resource) return;
    const own = tabs.find(
      (entry) =>
        entry.descriptor.kind === 'resource' &&
        entry.descriptor.id === resourceId,
    );
    if (own) renameTab(own.tabId, resourceLabel(resource, t('library.untitled')));
  }, [resource, tabs, resourceId, renameTab, t]);

  const advanceStage = useCallback(async () => {
    if (!resource) return;
    try {
      setResource(
        await editResource(resourceId, { stage: nextStage(resource.stage) }),
      );
    } catch {
      /* silencioso */
    }
  }, [resource, resourceId]);

  async function handleEdit(body: CreateResourceBody) {
    setSavingEdit(true);
    try {
      setResource(
        await editResource(resourceId, {
          title: body.title,
          type: body.type,
          author: body.author ?? null,
          url: body.url ?? null,
          description: body.description ?? null,
          labelIds: body.labelIds,
        }),
      );
      setEditing(false);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleCreateGoal(body: CreateGoalBody) {
    await createGoal(body);
    setCreatingGoal(false);
    await loadGoals();
  }

  async function handleEditGoal(body: CreateGoalBody) {
    if (!editingGoal) return;
    setSavingGoal(true);
    try {
      // `type` não é editável (trocar tipo = recriar); envia só o resto.
      await editGoal(editingGoal.id, {
        title: body.title,
        description: body.description,
        targetValue: body.targetValue,
        unit: body.unit,
        period: body.period,
        timesPerPeriod: body.timesPerPeriod,
        weekdays: body.weekdays,
        labelIds: body.labelIds,
      });
      setEditingGoal(null);
      await loadGoals();
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleArchiveGoal() {
    if (!editingGoal) return;
    setSavingGoal(true);
    try {
      await archiveGoal(editingGoal.id);
      setEditingGoal(null);
      await loadGoals();
    } finally {
      setSavingGoal(false);
    }
  }

  async function logReading(goalId: string, value?: number) {
    await checkGoal(goalId, value != null ? { value } : {});
    const p = await getGoalProgress(goalId);
    setGoalProgress((prev) => ({ ...prev, [goalId]: p }));
  }

  // Fichamento = Note STUDY_NOTE ligada ao recurso; abre o editor direto.
  async function handleNewFichamento() {
    const note = await createNote({
      type: 'STUDY_NOTE',
      doc: {},
      resourceId,
    });
    setNotes((prev) => [note, ...prev]);
    openTab({
      kind: 'note',
      id: note.id,
      title: notePreview(note) || t('notes.untitled'),
    });
  }

  async function handleCreateStudyItem(body: CreateStudyItemInput) {
    const item = await createStudyItem(body);
    setStudyItems((prev) => [item, ...prev]);
    setCreatingStudyItem(false);
    openTab({ kind: 'studyItem', id: item.id, title: item.title });
  }

  async function handleCreatePublication(values: {
    title: string;
    format: PublicationFormatInput;
  }) {
    // Rascunho da publicação: uma Note vazia. A publicação nasce do recurso
    // (sourceType='resource'), então aparece na lista transitiva como direta.
    const note = await createNote({
      type: 'NOTE',
      doc: { type: 'doc', content: [] },
      title: values.title,
    });
    let pub = await createPublication({
      sourceType: 'resource',
      sourceId: resourceId,
      format: values.format,
      title: values.title,
    });
    pub = await editPublication(pub.id, { noteId: note.id });
    setPublications((prev) => [pub, ...prev]);
    setCreatingPublication(false);
    openTab({
      kind: 'publication',
      id: pub.id,
      title: publicationLabel(pub, t('publish.create.title')),
    });
  }

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

  const title = resourceLabel(resource, t('library.untitled'));

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col overflow-y-auto px-6 py-6">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-muted">
            <BookOpen size={20} strokeWidth={1.75} aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-semibold text-fg">
              {title}
            </h1>
            <p className="mt-0.5 truncate text-sm text-muted">
              {t(`resource.type.${resource.type}`)}
              {resource.author ? ` · ${resource.author}` : ''}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void advanceStage()}
              className="rounded-full border border-subtle px-3 py-1 text-xs font-semibold text-muted transition-colors hover:bg-card"
            >
              {t(`resource.stage.${resource.stage}`)}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={t('resource.edit')}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-card"
            >
              <Pencil size={15} strokeWidth={1.85} />
            </button>
          </div>
        </div>

        {resource.description?.trim() && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {resource.description}
          </p>
        )}

        {/* Objetivos de leitura (vários) */}
        <div className="flex flex-col gap-2">
          {goals.map((goal) => (
            <ReadingGoalRow
              key={goal.id}
              goal={goal}
              progress={goalProgress[goal.id]}
              onLog={(value) => logReading(goal.id, value)}
              onEdit={() => setEditingGoal(goal)}
            />
          ))}
          <button
            type="button"
            onClick={() => setCreatingGoal(true)}
            className="flex items-center gap-2 self-start rounded-full border border-dashed border-subtle px-3 py-1.5 text-sm text-accent transition-colors hover:bg-card"
          >
            <Plus size={15} strokeWidth={2} />
            {t('resource.reading.new')}
          </button>
        </div>
      </header>

      {/* Controle segmentado */}
      <nav
        className="mt-6 flex gap-1 rounded-full bg-card p-1"
        role="tablist"
        aria-label={title}
      >
        <SegTab
          active={tab === 'highlights'}
          onClick={() => setTab('highlights')}
          label={t('resource.tab.highlights')}
        />
        <SegTab
          active={tab === 'study'}
          onClick={() => setTab('study')}
          label={t('resource.tab.study')}
          count={notes.length + studyItems.length}
        />
        <SegTab
          active={tab === 'publications'}
          onClick={() => setTab('publications')}
          label={t('resource.tab.publications')}
          count={publications.length}
        />
      </nav>

      <section className="mt-5 flex-1">
        {tab === 'highlights' && <HighlightsSection resourceId={resourceId} />}

        {tab === 'study' && (
          <div className="flex flex-col gap-6">
            <ItemList
              title={t('resource.notes.title')}
              empty={t('resource.notes.empty')}
              onNew={() => void handleNewFichamento()}
              items={notes.map((note) => ({
                id: note.id,
                label: notePreview(note) || t('notes.untitled'),
                accent: NOTE_COLOR[note.type],
                icon: <FileText size={14} strokeWidth={1.75} />,
                onOpen: () =>
                  openTab({
                    kind: 'note',
                    id: note.id,
                    title: notePreview(note) || t('notes.untitled'),
                  }),
              }))}
            />
            <ItemList
              title={t('resource.studyItems.title')}
              empty={t('study.empty')}
              onNew={() => setCreatingStudyItem(true)}
              items={studyItems.map((item) => ({
                id: item.id,
                label: item.title,
                icon: <GraduationCap size={14} strokeWidth={1.75} />,
                onOpen: () =>
                  openTab({
                    kind: 'studyItem',
                    id: item.id,
                    title: item.title,
                  }),
              }))}
            />
          </div>
        )}

        {tab === 'publications' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setCreatingPublication(true)}
              className="flex items-center gap-2 self-start rounded-full border border-dashed border-subtle px-3 py-1.5 text-sm text-accent transition-colors hover:bg-card"
            >
              <Plus size={15} strokeWidth={2} />
              {t('publish.new')}
            </button>
            {publications.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                {t('resource.publications.empty')}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {publications.map((pub) => (
                  <li key={pub.id}>
                    <button
                      type="button"
                      onClick={() =>
                        openTab({
                          kind: 'publication',
                          id: pub.id,
                          title: publicationLabel(
                            pub,
                            t('publish.create.title'),
                          ),
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-card"
                    >
                      <Megaphone
                        size={15}
                        strokeWidth={1.75}
                        className="shrink-0 text-faint"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-fg">
                        {publicationLabel(pub, t('publish.create.title'))}
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide"
                        style={{
                          color: PUB_STAGE_COLOR[pub.stage],
                          border: `1px solid ${PUB_STAGE_COLOR[pub.stage]}`,
                        }}
                      >
                        {t(stageLabelKey(pub.stage))}
                      </span>
                      <span className="shrink-0 text-[0.625rem] uppercase tracking-wide text-faint">
                        {t(formatLabelKey(pub.format))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Arquivar / restaurar / excluir recurso */}
      {resource.status === 'ARCHIVED' ? (
        <div className="mt-8 flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() =>
              void unarchiveResource(resource.id).then(setResource).catch(() => {})
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
      ) : (
        <div className="mt-8">
          <Button variant="secondary" onClick={() => setConfirm('archive')}>
            {t('resources.archive')}
          </Button>
        </div>
      )}

      {/* Editar recurso */}
      <BottomSheet open={editing} onClose={() => setEditing(false)} size="full">
        {editing && (
          <ResourceForm
            key={resource.id}
            initial={resource}
            onSubmit={handleEdit}
            submitting={savingEdit}
            renderLabelPicker={(p) => <LabelSelect {...p} />}
          />
        )}
      </BottomSheet>

      {/* Novo objetivo de leitura */}
      <BottomSheet
        open={creatingGoal}
        onClose={() => setCreatingGoal(false)}
        size="full"
      >
        {creatingGoal && (
          <GoalForm
            onSubmit={handleCreateGoal}
            defaultTitle={title}
            defaultType="PROJECT"
            defaultUnit={t('resource.reading.unit')}
            resourceId={resourceId}
            renderLabelPicker={(p) => <LabelSelect {...p} />}
          />
        )}
      </BottomSheet>

      {/* Editar / arquivar objetivo */}
      <BottomSheet
        open={editingGoal !== null}
        onClose={() => setEditingGoal(null)}
        size="full"
      >
        {editingGoal && (
          <div className="flex flex-col gap-3">
            <GoalForm
              key={editingGoal.id}
              initial={editingGoal}
              onSubmit={handleEditGoal}
              submitting={savingGoal}
              renderLabelPicker={(p) => <LabelSelect {...p} />}
            />
            <button
              type="button"
              onClick={() => void handleArchiveGoal()}
              disabled={savingGoal}
              className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] border border-subtle py-2.5 text-sm font-medium text-muted transition-colors hover:bg-card disabled:opacity-50"
            >
              <Archive size={16} strokeWidth={1.85} />
              {t('goals.archive')}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Novo item de estudo (pré-ligado ao recurso) */}
      <BottomSheet
        open={creatingStudyItem}
        onClose={() => setCreatingStudyItem(false)}
        size="full"
      >
        {creatingStudyItem && (
          <StudyItemCreateForm
            onSubmit={handleCreateStudyItem}
            resourceId={resourceId}
          />
        )}
      </BottomSheet>

      {/* Nova publicação (a partir do recurso) */}
      <BottomSheet
        open={creatingPublication}
        onClose={() => setCreatingPublication(false)}
        size="full"
      >
        {creatingPublication && (
          <PublicationCreateForm onSubmit={handleCreatePublication} />
        )}
      </BottomSheet>

      <ConfirmDialog
        open={confirm === 'archive'}
        tone="default"
        title={t('resources.archiveConfirm.title')}
        body={t('resources.archiveConfirm.body')}
        confirmLabel={t('resources.archiveConfirm.confirm')}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setResource(await archiveResource(resource.id));
          setConfirm(null);
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        tone="danger"
        title={t('resources.deleteConfirm.title')}
        body={t('resources.deleteConfirm.body')}
        confirmLabel={t('resources.deleteConfirm.confirm')}
        blockedMessage={t('resources.deleteBlocked')}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await deleteResource(resource.id);
          setConfirm(null);
          const own = tabs.find(
            (entry) =>
              entry.descriptor.kind === 'resource' &&
              entry.descriptor.id === resourceId,
          );
          if (own) closeTab(own.tabId);
        }}
      />
    </div>
  );
}

function SegTab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-raised text-fg shadow-sm' : 'text-muted hover:text-fg'
      }`}
    >
      {label}
      {count != null && count > 0 && (
        <span className="text-[0.6875rem] font-semibold text-faint">
          {count}
        </span>
      )}
    </button>
  );
}

interface ListItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  accent?: string;
  onOpen: () => void;
}

function ItemList({
  title,
  empty,
  items,
  onNew,
}: {
  title: string;
  empty: string;
  items: ListItem[];
  onNew?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {title}
        </h2>
        {onNew && (
          <button
            type="button"
            onClick={onNew}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-accent transition-colors hover:bg-card"
          >
            <Plus size={13} strokeWidth={2.25} />
            {t('resource.notes.new')}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onOpen}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card"
              >
                {item.accent && (
                  <span
                    className="h-3.5 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: item.accent }}
                    aria-hidden
                  />
                )}
                <span className="shrink-0 text-faint" aria-hidden>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReadingGoalRow({
  goal,
  progress,
  onLog,
  onEdit,
}: {
  goal: GoalResponse;
  progress: GoalProgressResponse | undefined;
  onLog: (value?: number) => Promise<void>;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const [logging, setLogging] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const needsValue = goal.type === 'TARGET' || goal.type === 'PROJECT';
  const done = progress?.done ?? 0;
  const target = progress?.target ?? goal.targetValue;

  async function submit(v?: number) {
    setBusy(true);
    try {
      await onLog(v);
      setLogging(false);
      setValue('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-subtle bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <ProgressRing value={progressPercent(progress)} size={40} />
          <span className="absolute inset-0 flex items-center justify-center text-[0.625rem] font-semibold text-fg">
            {progressPercent(progress)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{goal.title}</p>
          {target != null && (
            <p className="text-xs text-muted">
              {done}
              {' / '}
              {target}
              {goal.unit ? ` ${goal.unit}` : ''}
            </p>
          )}
        </div>
        {!logging && (
          <button
            type="button"
            onClick={() => (needsValue ? setLogging(true) : void submit())}
            disabled={busy}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-[var(--cerebro-on-accent)] transition-opacity disabled:opacity-50"
          >
            <Check size={14} strokeWidth={2.5} />
            {t('resource.reading.log')}
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          aria-label={t('resource.edit')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised"
        >
          <Pencil size={14} strokeWidth={1.85} />
        </button>
      </div>

      {logging && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={t('resource.reading.howMuch')}
            placeholder={t('resource.reading.howMuch')}
            className="h-9 flex-1 rounded-[var(--radius-card)] border border-subtle bg-raised px-3 text-sm text-fg outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && Number(value) > 0) void submit(Number(value));
            }}
          />
          <Button
            size="sm"
            disabled={busy || !(Number(value) > 0)}
            onClick={() => void submit(Number(value))}
          >
            {t('common.save')}
          </Button>
        </div>
      )}
    </div>
  );
}
