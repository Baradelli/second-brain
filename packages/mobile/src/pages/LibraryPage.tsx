import type { ResourceResponse, ResourceStageInput } from '@cerebro/shared';
import { BottomSheet, Button, Card, EmptyState } from '@cerebro/ui';
import {
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

import { ResourceForm } from '../components/ResourceForm.js';
import {
  createResource,
  type CreateResourceBody,
  editResource,
  listResources,
} from '../lib/api/endpoints.js';

type StageFilter = 'all' | ResourceStageInput;

const STAGE_FILTERS: StageFilter[] = ['all', 'backlog', 'in_progress', 'done'];
const STAGE_CYCLE: ResourceStageInput[] = ['backlog', 'in_progress', 'done'];

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
  const [resources, setResources] = useState<ResourceResponse[]>([]);
  const [stage, setStage] = useState<StageFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creating, setCreating] = useState(false);

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

  async function advanceStage(resource: ResourceResponse) {
    const idx = STAGE_CYCLE.indexOf(resource.stage as ResourceStageInput);
    const next = STAGE_CYCLE[(idx + 1) % STAGE_CYCLE.length]!;
    await editResource(resource.id, { stage: next });
    await reload();
  }

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

      {!loading && !error && resources.length === 0 && (
        <EmptyState
          icon={<BookOpen size={20} strokeWidth={1.75} />}
          title={t('library.empty')}
          body={t('library.comingSoonBody')}
        />
      )}

      {!loading && !error && resources.length > 0 && (
        <div className="space-y-2.5" data-testid="library-list">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} onAdvance={advanceStage} />
          ))}
        </div>
      )}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <ResourceForm onSubmit={handleCreate} submitting={creating} />
      </BottomSheet>
    </main>
  );
}

function ResourceCard({
  resource,
  onAdvance,
}: {
  resource: ResourceResponse;
  onAdvance: (r: ResourceResponse) => void;
}) {
  const { t } = useTranslation();
  const Icon = TYPE_ICON[resource.type] ?? BookOpen;
  return (
    <Card padding="sm">
      <div className="flex items-start gap-3">
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
