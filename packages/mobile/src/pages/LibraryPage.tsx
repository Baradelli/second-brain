import type { ResourceResponse, ResourceStageInput } from '@cerebro/shared';
import {
  createResource,
  type CreateResourceBody,
  deleteResource,
  editResource,
  listResources,
  unarchiveResource,
} from '@cerebro/shared/client';
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ResourceForm,
} from '@cerebro/ui';
import {
  BookOpen,
  FileText,
  GraduationCap,
  type LucideIcon,
  Mic,
  Plus,
  RotateCcw,
  Trash2,
  Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { LabelFilter } from '../components/LabelFilter.js';
import { LabelPicker } from '../components/LabelPicker.js';

type StageFilter = 'all' | ResourceStageInput;
type TypeFilter = 'all' | ResourceResponse['type'];
type SortBy = 'recent' | 'title' | 'type';

const STAGE_FILTERS: StageFilter[] = ['all', 'backlog', 'in_progress', 'done'];
const STAGE_CYCLE: ResourceStageInput[] = ['backlog', 'in_progress', 'done'];
const TYPE_OPTIONS = [
  'book',
  'course',
  'video',
  'article',
  'podcast',
  'other',
] as const;
const SORT_OPTIONS: SortBy[] = ['recent', 'title', 'type'];

const TYPE_ICON: Record<string, LucideIcon> = {
  book: BookOpen,
  course: GraduationCap,
  video: Video,
  article: FileText,
  podcast: Mic,
  other: BookOpen,
};

export function LibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [resources, setResources] = useState<ResourceResponse[]>([]);
  const [stage, setStage] = useState<StageFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');

  // Arquivados (Tarefa 78 — paridade com o web/ADR 0004).
  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<ResourceResponse[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<ResourceResponse | null>(
    null,
  );
  const [deleteBlocked, setDeleteBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listResources({ stage: stage === 'all' ? undefined : stage })
      .then((data) => {
        if (!cancelled) setResources(data);
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
  }, [stage]);

  async function reload() {
    const data = await listResources({
      stage: stage === 'all' ? undefined : stage,
    });
    setResources(data);
  }

  async function handleCreate(body: CreateResourceBody) {
    setCreating(true);
    try {
      await createResource(body);
      setSheetOpen(false);
      await reload();
    } finally {
      setCreating(false);
    }
  }

  async function loadArchived() {
    setArchived(await listResources({ status: 'ARCHIVED' }));
  }

  async function toggleArchived() {
    const next = !showArchived;
    setShowArchived(next);
    if (next) await loadArchived().catch(() => setArchived([]));
  }

  async function handleRestore(id: string) {
    await unarchiveResource(id);
    await Promise.all([reload(), loadArchived()]);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleteBlocked(false);
    try {
      await deleteResource(confirmDelete.id);
      setConfirmDelete(null);
      await loadArchived();
    } catch {
      // 409: há notas/itens de estudo/grifos ligados — exclusão bloqueada.
      setDeleteBlocked(true);
    }
  }

  async function advanceStage(resource: ResourceResponse) {
    const idx = STAGE_CYCLE.indexOf(resource.stage as ResourceStageInput);
    const next = STAGE_CYCLE[(idx + 1) % STAGE_CYCLE.length]!;
    await editResource(resource.id, { stage: next });
    await reload();
  }

  const visible = resources
    .filter((r) => typeFilter === 'all' || r.type === typeFilter)
    .filter((r) => !labelFilter || r.labelIds.includes(labelFilter))
    .slice()
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'type')
        return a.type.localeCompare(b.type) || a.title.localeCompare(b.title);
      return b.createdAt.localeCompare(a.createdAt); // recent first
    });

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <h1
          className="font-display text-[1.75rem] font-semibold leading-tight"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('nav.library')}
        </h1>
        <Button
          size="sm"
          onClick={() => setSheetOpen(true)}
          data-testid="new-resource-button"
        >
          <Plus size={16} strokeWidth={2.25} />
          {t('library.new')}
        </Button>
      </div>

      {/* Filtro por stage */}
      <div className="mb-5 flex flex-wrap gap-2">
        {STAGE_FILTERS.map((s) => {
          const active = s === stage;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStage(s)}
              data-testid={`stage-filter-${s}`}
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
              {t(`resource.stage.${s}`)}
            </button>
          );
        })}
      </div>

      {/* Filtro por label */}
      <LabelFilter value={labelFilter} onChange={setLabelFilter} />

      {/* Tipo + ordenação */}
      <div className="mb-5 flex gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          data-testid="type-filter"
          aria-label={t('library.filter.type')}
          className="h-9 flex-1 rounded-full px-3 text-xs font-semibold outline-none"
          style={{
            backgroundColor: 'var(--cerebro-raised)',
            color: 'var(--cerebro-fg)',
            border: '1px solid var(--cerebro-border)',
          }}
        >
          <option value="all">{t('library.type.all')}</option>
          {TYPE_OPTIONS.map((tp) => (
            <option key={tp} value={tp}>
              {t(`resource.type.${tp}`)}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          data-testid="sort-by"
          aria-label={t('library.sort.label')}
          className="h-9 flex-1 rounded-full px-3 text-xs font-semibold outline-none"
          style={{
            backgroundColor: 'var(--cerebro-raised)',
            color: 'var(--cerebro-fg)',
            border: '1px solid var(--cerebro-border)',
          }}
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`library.sort.${s}`)}
            </option>
          ))}
        </select>
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

      {!loading && !error && visible.length === 0 && (
        <EmptyState
          icon={<BookOpen size={20} strokeWidth={1.75} />}
          title={t('library.empty')}
          body={t('library.comingSoonBody')}
        />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="space-y-2.5" data-testid="library-list">
          {visible.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              onAdvance={advanceStage}
              onOpen={() => navigate(`/library/${r.id}`)}
            />
          ))}
        </div>
      )}

      {/* Arquivados (Tarefa 78) */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => void toggleArchived()}
          data-testid="toggle-archived-resources"
          className="text-sm font-medium"
          style={{ color: 'var(--cerebro-accent)' }}
        >
          {showArchived
            ? t('resources.archived.hide')
            : t('resources.archived.show')}
        </button>

        {showArchived && (
          <div className="mt-3 space-y-2" data-testid="archived-resources">
            {archived.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
                {t('resources.archived.empty')}
              </p>
            ) : (
              archived.map((r) => (
                <Card key={r.id} padding="sm">
                  <div className="flex items-center gap-2">
                    <p
                      className="min-w-0 flex-1 truncate text-sm font-medium"
                      style={{ color: 'var(--cerebro-muted)' }}
                    >
                      {r.title}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRestore(r.id)}
                      data-testid={`restore-resource-${r.id}`}
                    >
                      <RotateCcw size={14} strokeWidth={2} />
                      {t('common.restore')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteBlocked(false);
                        setConfirmDelete(r);
                      }}
                      aria-label={t('common.delete')}
                      data-testid={`delete-resource-${r.id}`}
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <ResourceForm
          onSubmit={handleCreate}
          submitting={creating}
          renderLabelPicker={(p) => <LabelPicker {...p} />}
        />
      </BottomSheet>

      {/* Confirmação de exclusão definitiva (ADR 0004) */}
      <BottomSheet
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
      >
        <div className="flex flex-col gap-3">
          <h2
            className="font-display text-lg font-semibold"
            style={{ color: 'var(--cerebro-fg)' }}
          >
            {t('resources.deleteConfirm.title')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
            {t('resources.deleteConfirm.body')}
          </p>
          {deleteBlocked && (
            <p className="text-xs" style={{ color: 'var(--cerebro-error)' }}>
              {t('resources.deleteBlocked')}
            </p>
          )}
          <Button
            onClick={() => void handleDelete()}
            data-testid="confirm-delete-resource"
          >
            {t('resources.deleteConfirm.confirm')}
          </Button>
        </div>
      </BottomSheet>
    </main>
  );
}

function ResourceCard({
  resource,
  onAdvance,
  onOpen,
}: {
  resource: ResourceResponse;
  onAdvance: (r: ResourceResponse) => void;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const Icon = TYPE_ICON[resource.type] ?? BookOpen;
  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onOpen}
          data-testid={`open-resource-${resource.id}`}
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
            <Icon size={18} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {resource.title}
            </p>
            {resource.author && (
              <p
                className="truncate text-xs"
                style={{ color: 'var(--cerebro-muted)' }}
              >
                {resource.author}
              </p>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onAdvance(resource)}
          data-testid={`advance-stage-${resource.id}`}
          className="shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold transition-colors"
          style={{
            backgroundColor: 'var(--cerebro-raised)',
            color: 'var(--cerebro-muted)',
            border: '1px solid var(--cerebro-border)',
          }}
        >
          {t(`resource.stage.${resource.stage}`)}
        </button>
      </div>
    </Card>
  );
}
