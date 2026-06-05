import type { GoalProgressResponse, GoalResponse } from '@cerebro/shared';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  EmptyState,
  ProgressRing,
} from '@cerebro/ui';
import { Check, Plus, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GoalForm } from '../components/GoalForm.js';
import {
  checkGoal,
  completeGoal,
  createGoal,
  type CreateGoalBody,
  getGoalProgress,
  listActiveGoals,
} from '../lib/api/endpoints.js';

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
  const [valueFor, setValueFor] = useState<GoalResponse | null>(null);
  const [value, setValue] = useState('');

  async function load() {
    setError(false);
    const list = await listActiveGoals();
    setGoals(list);
    const entries = await Promise.all(
      list.map(async (g) => [g.id, await getGoalProgress(g.id)] as const),
    );
    setProgress(Object.fromEntries(entries));
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

  async function handleAction(goal: GoalResponse) {
    if (goal.type === 'UMBRELLA') {
      await completeGoal(goal.id);
    } else if (goal.type === 'HABIT') {
      await checkGoal(goal.id);
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

      {!loading && !error && goals.length === 0 && (
        <EmptyState
          icon={<Target size={20} strokeWidth={1.75} />}
          title={t('goals.empty')}
        />
      )}

      {!loading && !error && goals.length > 0 && (
        <div className="space-y-2.5" data-testid="goals-list">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              progress={progress[g.id]}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <GoalForm onSubmit={handleCreate} submitting={creating} />
      </BottomSheet>

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
    </main>
  );
}

function GoalCard({
  goal,
  progress,
  onAction,
}: {
  goal: GoalResponse;
  progress?: GoalProgressResponse;
  onAction: (g: GoalResponse) => void;
}) {
  const { t } = useTranslation();
  const ratio = progress?.ratio ?? 0;
  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
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
        <Button
          size="sm"
          variant={goal.type === 'UMBRELLA' ? 'secondary' : 'primary'}
          onClick={() => onAction(goal)}
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
