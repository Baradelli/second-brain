import type {
  ArchivedGoalResponse,
  GoalProgressResponse,
  GoalResponse,
} from '@cerebro/shared';
import {
  archiveGoal,
  checkGoal,
  completeGoal,
  createGoal,
  type CreateGoalBody,
  deleteGoal,
  editGoal,
  getGoalProgress,
  listActiveGoals,
  listArchivedGoals,
  unarchiveGoal,
  undoCheck,
} from '@cerebro/shared/client';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  ProgressRing,
} from '@cerebro/ui';
import { Archive, Check, Plus, RotateCcw, Target, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GoalForm } from '../components/GoalForm.js';
import { LabelFilter } from '../components/LabelFilter.js';

export function GoalsPage() {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [progress, setProgress] = useState<
    Record<string, GoalProgressResponse>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [valueFor, setValueFor] = useState<GoalResponse | null>(null);
  const [value, setValue] = useState('');

  const [editingGoal, setEditingGoal] = useState<GoalResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState(false);

  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<ArchivedGoalResponse[]>([]);
  const [confirmDelete, setConfirmDelete] =
    useState<ArchivedGoalResponse | null>(null);

  async function load() {
    setError(false);
    const list = await listActiveGoals();
    setGoals(list);
    const entries = await Promise.all(
      list.map(async (g) => [g.id, await getGoalProgress(g.id)] as const),
    );
    setProgress(Object.fromEntries(entries));
  }

  async function loadArchived() {
    setArchived(await listArchivedGoals());
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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
  }, []);

  async function handleCreate(body: CreateGoalBody) {
    setCreating(true);
    try {
      await createGoal(body);
      setSheetOpen(false);
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function handleEdit(body: CreateGoalBody) {
    if (!editingGoal) return;
    setSaving(true);
    try {
      // `type` não é editável (trocar tipo = recriar) — envia só o resto como patch.
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
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!editingGoal) return;
    setSaving(true);
    setSheetError(false);
    try {
      await archiveGoal(editingGoal.id);
      setEditingGoal(null);
      await load();
      if (showArchived) await loadArchived();
    } catch {
      setSheetError(true);
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchived() {
    const next = !showArchived;
    setShowArchived(next);
    if (next) await loadArchived().catch(() => setArchived([]));
  }

  async function handleRestore(id: string) {
    await unarchiveGoal(id);
    await Promise.all([load(), loadArchived()]);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    await deleteGoal(confirmDelete.id);
    setConfirmDelete(null);
    await loadArchived();
  }

  async function handleAction(goal: GoalResponse) {
    if (goal.type === 'UMBRELLA') {
      await completeGoal(goal.id);
    } else if (goal.type === 'HABIT') {
      const p = progress[goal.id];
      if (p?.doneToday && p.todayEventId) {
        // Já marcado hoje → clicar de novo desmarca (corrige um check por engano).
        await undoCheck(p.todayEventId);
      } else {
        await checkGoal(goal.id);
      }
    } else {
      // TARGET/PROJECT: pede o valor
      setValueFor(goal);
      setValue('');
      return;
    }
    await load();
  }

  async function confirmValue() {
    if (!valueFor) return;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return;
    await checkGoal(valueFor.id, { value: n });
    setValueFor(null);
    await load();
  }

  const visible = labelFilter
    ? goals.filter((g) => g.labelIds.includes(labelFilter))
    : goals;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <div className="mb-5 flex items-center justify-between">
        <h1
          className="font-display text-[1.75rem] font-semibold leading-tight"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('goals.title')}
        </h1>
        <Button
          size="sm"
          onClick={() => setSheetOpen(true)}
          data-testid="new-goal-button"
        >
          <Plus size={16} strokeWidth={2.25} />
          {t('goals.new')}
        </Button>
      </div>

      <LabelFilter value={labelFilter} onChange={setLabelFilter} />

      {loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.loading')}
        </p>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('goals.error')}
        </p>
      )}

      {!loading && !error && visible.length === 0 && (
        <EmptyState
          icon={<Target size={20} strokeWidth={1.75} />}
          title={t('goals.empty')}
        />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="space-y-2.5" data-testid="goals-list">
          {visible.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              progress={progress[g.id]}
              onAction={handleAction}
              onEdit={() => {
                setSheetError(false);
                setEditingGoal(g);
              }}
            />
          ))}
        </div>
      )}

      {/* Arquivados */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => void toggleArchived()}
          data-testid="toggle-archived"
          className="text-sm font-medium"
          style={{ color: 'var(--cerebro-accent)' }}
        >
          {showArchived ? t('goals.archived.hide') : t('goals.archived.show')}
        </button>

        {showArchived && (
          <div className="mt-3 space-y-2" data-testid="archived-list">
            {archived.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
                {t('goals.archived.empty')}
              </p>
            ) : (
              archived.map((g) => (
                <ArchivedCard
                  key={g.id}
                  goal={g}
                  onRestore={() => void handleRestore(g.id)}
                  onDelete={() => setConfirmDelete(g)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Criar */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <GoalForm onSubmit={handleCreate} submitting={creating} />
      </BottomSheet>

      {/* Editar */}
      <BottomSheet
        open={editingGoal !== null}
        onClose={() => setEditingGoal(null)}
      >
        {editingGoal && (
          <div className="flex flex-col gap-3">
            <GoalForm
              key={editingGoal.id}
              initial={editingGoal}
              onSubmit={handleEdit}
              submitting={saving}
            />
            <button
              type="button"
              onClick={() => void handleArchive()}
              disabled={saving}
              data-testid="archive-goal"
              className="flex items-center justify-center gap-2 rounded-[var(--radius-card)] py-2.5 text-sm font-medium"
              style={{
                color: 'var(--cerebro-muted)',
                border: '1px solid var(--cerebro-border)',
              }}
            >
              <Archive size={16} strokeWidth={1.85} />
              {t('goals.archive')}
            </button>
            {sheetError && (
              <p className="text-xs" style={{ color: 'var(--cerebro-error)' }}>
                {t('goals.archive.error')}
              </p>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Pede valor (TARGET/PROJECT) */}
      <BottomSheet open={valueFor !== null} onClose={() => setValueFor(null)}>
        <div className="flex flex-col gap-3">
          <h2
            className="font-display text-lg font-semibold"
            style={{ color: 'var(--cerebro-fg)' }}
          >
            {t('goals.check.howMuch')}
          </h2>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={t('goals.check.howMuch')}
            data-testid="check-value-input"
            className="h-11 w-full rounded-[var(--radius-card)] px-4 text-sm outline-none"
            style={{
              backgroundColor: 'var(--cerebro-raised)',
              color: 'var(--cerebro-fg)',
              border: '1px solid var(--cerebro-border)',
            }}
          />
          <Button
            onClick={() => void confirmValue()}
            data-testid="confirm-check"
          >
            {t('goals.check.confirm')}
          </Button>
        </div>
      </BottomSheet>

      {/* Confirmar exclusão */}
      <BottomSheet
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
      >
        {confirmDelete && (
          <div className="flex flex-col gap-3">
            <h2
              className="font-display text-lg font-semibold"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {t('goals.deleteConfirm.title')}
            </h2>
            <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
              {t('goals.deleteConfirm.body')}
            </p>
            <Button
              onClick={() => void handleDelete()}
              data-testid="confirm-delete"
            >
              {t('goals.deleteConfirm.confirm')}
            </Button>
          </div>
        )}
      </BottomSheet>
    </main>
  );
}

function GoalCard({
  goal,
  progress,
  onAction,
  onEdit,
}: {
  goal: GoalResponse;
  progress?: GoalProgressResponse;
  onAction: (g: GoalResponse) => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const ratio = progress?.ratio ?? 0;
  const doneToday = goal.type === 'HABIT' && (progress?.doneToday ?? false);
  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          data-testid={`goal-edit-${goal.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ProgressRing value={Math.round(ratio * 100)} />
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {goal.title}
            </p>
            <Chip>{t(`goal.type.${goal.type}`)}</Chip>
          </div>
        </button>
        <Button
          size="sm"
          variant={
            goal.type === 'UMBRELLA' || doneToday ? 'secondary' : 'primary'
          }
          onClick={() => onAction(goal)}
          aria-pressed={doneToday}
          aria-label={doneToday ? t('goals.uncheck') : undefined}
          data-testid={`goal-action-${goal.id}`}
        >
          {goal.type === 'UMBRELLA' ? (
            t('goals.complete')
          ) : (
            <Check size={16} strokeWidth={2.5} />
          )}
        </Button>
      </div>
    </Card>
  );
}

function ArchivedCard({
  goal,
  onRestore,
  onDelete,
}: {
  goal: ArchivedGoalResponse;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-medium"
            style={{ color: 'var(--cerebro-muted)' }}
          >
            {goal.title}
          </p>
          <Chip>{t(`goal.type.${goal.type}`)}</Chip>
        </div>
        <button
          type="button"
          onClick={onRestore}
          aria-label={t('goals.restore')}
          data-testid={`restore-goal-${goal.id}`}
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ color: 'var(--cerebro-accent)' }}
        >
          <RotateCcw size={17} strokeWidth={1.85} />
        </button>
        {goal.deletable && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('goals.delete')}
            data-testid={`delete-goal-${goal.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ color: 'var(--cerebro-error)' }}
          >
            <Trash2 size={17} strokeWidth={1.85} />
          </button>
        )}
      </div>
    </Card>
  );
}
