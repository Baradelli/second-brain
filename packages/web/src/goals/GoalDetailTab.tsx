import type { GoalProgressResponse, GoalResponse } from '@cerebro/shared';
import {
  archiveGoal,
  checkGoal,
  completeGoal,
  deleteGoal,
  editGoal,
  getGoalProgress,
  listActiveGoals,
  listArchivedGoals,
  skipGoal,
  unarchiveGoal,
  undoCheck,
} from '@cerebro/shared/client';
import { Button, Input, ProgressRing } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { ConfirmDialog } from '../shared/ConfirmDialog.js';
import { useTabs } from '../tabs/tabs-context.js';
import { useActiveGoals } from './active-goal-context.js';
import {
  cadenceDescriptor,
  goalActions,
  goalLabel,
  goalProgressPercent,
} from './goal-display.js';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const PERIODS = ['day', 'week', 'month'] as const;

// `type` não é editável (trocar tipo = recriar) — espelha o GoalForm do mobile.
const goalFormSchema = z.object({
  title: z.string().trim().min(1),
  period: z.enum(PERIODS).optional(),
  timesPerPeriod: z.coerce.number().optional(),
  targetValue: z.coerce.number().optional(),
  unit: z.string().optional(),
});
type GoalFormValues = z.infer<typeof goalFormSchema>;

/** Busca um objetivo por id nas listas ativa e arquivada (não há GET /goals/:id). */
async function loadGoal(goalId: string): Promise<GoalResponse | null> {
  const active = await listActiveGoals();
  const found = active.find((g) => g.id === goalId);
  if (found) return found;
  const archived = await listArchivedGoals();
  return archived.find((g) => g.id === goalId) ?? null;
}

/**
 * Aba de detalhe/edição de um objetivo no desktop. Carrega o objetivo por id e o
 * progresso CALCULADO pelo backend (`getGoalProgress` — nunca recalculado aqui),
 * mostra tipo/cadência/progresso (ProgressRing), oferece as ações que cabem ao
 * tipo (check/skip/undo/complete/archive·unarchive — mesma semântica do mobile),
 * permite editar título/cadência/medida via react-hook-form + zodResolver, e
 * renomeia a própria aba quando o título carrega/muda. Publica o objetivo no
 * `ActiveGoalsContext` para o painel direito ler. Reusa os endpoints do shared.
 */
export function GoalDetailTab({ goalId }: { goalId: string }) {
  const { t } = useTranslation();
  const { renameTab, closeTab, tabs } = useTabs();
  const { set, clear } = useActiveGoals();
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);

  const [goal, setGoal] = useState<GoalResponse | null>(null);
  const [progress, setProgress] = useState<GoalProgressResponse | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [actionError, setActionError] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [checkValue, setCheckValue] = useState('');
  const [showCheckValue, setShowCheckValue] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormValues>({ resolver: zodResolver(goalFormSchema) });

  const refresh = useCallback(async () => {
    const [g, p] = await Promise.all([
      loadGoal(goalId),
      getGoalProgress(goalId),
    ]);
    setGoal(g);
    setProgress(p);
    if (g) {
      reset({
        title: g.title,
        period: g.period ?? undefined,
        timesPerPeriod: g.timesPerPeriod ?? undefined,
        targetValue: g.targetValue ?? undefined,
        unit: g.unit ?? undefined,
      });
    }
    return g;
  }, [goalId, reset]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    refresh()
      .then((g) => {
        if (!cancelled && !g) setError(true);
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
  }, [refresh]);

  // Publica o objetivo + progresso (calculado) para o painel direito.
  useEffect(() => {
    if (goal) set(goalId, { goal, progress, noteCount: 0 });
  }, [goal, progress, goalId, set]);

  useEffect(() => () => clear(goalId), [goalId, clear]);

  // Renomeia a própria aba com o título de verdade quando ele muda (no-op se igual).
  useEffect(() => {
    if (!goal) return;
    const own = tabs.find(
      (tab) => tab.descriptor.kind === 'goal' && tab.descriptor.id === goalId,
    );
    if (own) renameTab(own.tabId, goalLabel(goal, t('goals.create.title')));
  }, [goal, tabs, goalId, renameTab, t]);

  const save = handleSubmit(async (values) => {
    if (!goal) return;
    setSaveStatus('saving');
    try {
      const updated = await editGoal(goalId, {
        title: values.title.trim(),
        // Só envia os campos que cabem ao tipo (espelha o submit do GoalForm).
        ...(goal.type === 'HABIT' && goal.weekdays.length === 0
          ? {
              period: values.period ?? null,
              timesPerPeriod: values.timesPerPeriod ?? null,
            }
          : {}),
        ...(goal.type === 'TARGET' || goal.type === 'PROJECT'
          ? {
              targetValue: values.targetValue ?? null,
              unit: values.unit?.trim() || null,
            }
          : {}),
      });
      setGoal(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  });

  const runAction = useCallback(
    async (fn: () => Promise<unknown>) => {
      setActionError(false);
      try {
        await fn();
        await refresh();
      } catch {
        setActionError(true);
      }
    },
    [refresh],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('agenda.loading')}</p>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted">{t('goals.error')}</p>
      </div>
    );
  }

  const actions = goalActions(goal.type);
  const archived = goal.status === 'ARCHIVED';
  const doneToday = progress?.doneToday ?? false;
  const percent = goalProgressPercent(progress);

  async function handleCheck() {
    if (!goal) return;
    if (actions.canUndo && doneToday && progress?.todayEventId) {
      await runAction(() => undoCheck(progress.todayEventId as string));
      return;
    }
    if (actions.checkNeedsValue) {
      setCheckValue('');
      setShowCheckValue(true);
      return;
    }
    await runAction(() => checkGoal(goal.id));
  }

  async function confirmCheckValue() {
    if (!goal) return;
    const n = Number(checkValue);
    if (!Number.isFinite(n) || n <= 0) return;
    setShowCheckValue(false);
    await runAction(() => checkGoal(goal.id, { value: n }));
  }

  async function confirmSkip() {
    if (!goal) return;
    const reason = skipReason.trim();
    if (!reason) return;
    setShowSkip(false);
    setSkipReason('');
    await runAction(() => skipGoal(goal.id, reason));
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col overflow-y-auto px-6 py-6">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full border border-subtle px-3 py-1 text-xs font-semibold text-muted">
            {t(`goal.type.${goal.type}`)}
          </span>
          <SaveIndicator status={saveStatus} t={t} />
        </div>

        {/* Progresso calculado + cadência */}
        <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-subtle bg-raised px-4 py-3">
          <ProgressRing value={percent} size={48} strokeWidth={4} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">
              {t('goals.progress.label', { percent })}
            </p>
            <p className="truncate text-xs text-muted">
              <CadenceText goal={goal} />
            </p>
          </div>
        </div>

        <Input
          label={t('goal.field.title')}
          error={errors.title ? t('goals.create.titleRequired') : undefined}
          {...register('title')}
        />

        {goal.type === 'HABIT' && goal.weekdays.length > 0 && (
          <p className="text-xs text-muted">
            {t('goal.cadence.weekdays')}: <CadenceText goal={goal} />
          </p>
        )}

        {goal.type === 'HABIT' && goal.weekdays.length === 0 && (
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium text-fg opacity-80">
                {t('goal.field.period')}
              </span>
              <select
                className="h-11 w-full rounded-[var(--radius-card)] border border-subtle bg-raised px-4 text-sm text-fg outline-none"
                {...register('period')}
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {t(`goal.period.${p}`)}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label={t('goal.field.timesPerPeriod')}
              type="number"
              {...register('timesPerPeriod')}
            />
          </div>
        )}

        {(goal.type === 'TARGET' || goal.type === 'PROJECT') && (
          <div className="flex gap-2">
            <Input
              label={t('goal.field.targetValue')}
              type="number"
              {...register('targetValue')}
            />
            <Input label={t('goal.field.unit')} {...register('unit')} />
          </div>
        )}

        <Button
          type="submit"
          disabled={saveStatus === 'saving'}
          className="mt-1"
        >
          {saveStatus === 'saving' ? t('capture.submitting') : t('common.save')}
        </Button>
      </form>

      {/* Ações (mesma semântica do mobile) */}
      {!archived && (
        <div className="mt-6 flex flex-wrap gap-2">
          {actions.complete && (
            <Button
              variant="primary"
              onClick={() => void runAction(() => completeGoal(goal.id))}
            >
              {t('goals.complete')}
            </Button>
          )}
          {actions.check && (
            <Button
              variant={doneToday ? 'secondary' : 'primary'}
              aria-pressed={doneToday}
              onClick={() => void handleCheck()}
            >
              {doneToday ? t('goals.uncheck') : t('goals.check.confirm')}
            </Button>
          )}
          {actions.skip && (
            <Button variant="secondary" onClick={() => setShowSkip((v) => !v)}>
              {t('goals.skip')}
            </Button>
          )}
          <Button variant="secondary" onClick={() => setConfirm('archive')}>
            {t('goals.archive')}
          </Button>
        </div>
      )}

      {archived && (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => void runAction(() => unarchiveGoal(goal.id))}
          >
            {t('goals.restore')}
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
        title={t('goals.archiveConfirm.title')}
        body={t('goals.archiveConfirm.body')}
        confirmLabel={t('goals.archiveConfirm.confirm')}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await archiveGoal(goal.id);
          setConfirm(null);
          await refresh();
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        tone="danger"
        title={t('goals.deleteConfirm.title')}
        body={t('goals.deleteConfirm.body')}
        confirmLabel={t('goals.deleteConfirm.confirm')}
        blockedMessage={t('goals.deleteBlocked')}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          await deleteGoal(goal.id);
          setConfirm(null);
          const own = tabs.find(
            (tab) =>
              tab.descriptor.kind === 'goal' && tab.descriptor.id === goalId,
          );
          if (own) closeTab(own.tabId);
        }}
      />

      {/* Valor do check (TARGET/PROJECT) */}
      {showCheckValue && (
        <div className="mt-4 flex flex-col gap-2 rounded-[var(--radius-card)] border border-subtle bg-raised p-3">
          <span className="text-sm font-medium text-fg">
            {t('goals.check.howMuch')}
          </span>
          <input
            type="number"
            value={checkValue}
            onChange={(e) => setCheckValue(e.target.value)}
            aria-label={t('goals.check.howMuch')}
            className="h-11 w-full rounded-[var(--radius-card)] border border-subtle bg-bg px-4 text-sm text-fg outline-none"
          />
          <Button onClick={() => void confirmCheckValue()}>
            {t('goals.check.confirm')}
          </Button>
        </div>
      )}

      {/* Motivo do skip (obrigatório) */}
      {showSkip && (
        <div className="mt-4 flex flex-col gap-2 rounded-[var(--radius-card)] border border-subtle bg-raised p-3">
          <span className="text-sm font-medium text-fg">
            {t('goals.skip.reasonLabel')}
          </span>
          <input
            type="text"
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            aria-label={t('goals.skip.reasonLabel')}
            className="h-11 w-full rounded-[var(--radius-card)] border border-subtle bg-bg px-4 text-sm text-fg outline-none"
          />
          <Button
            onClick={() => void confirmSkip()}
            disabled={!skipReason.trim()}
          >
            {t('goals.skip.confirm')}
          </Button>
        </div>
      )}

      {actionError && (
        <p className="mt-3 text-xs text-error">{t('goals.action.error')}</p>
      )}
    </div>
  );
}

/**
 * Texto da cadência/medida derivado da forma pura `cadenceDescriptor`. Os nomes
 * dos dias usam `toLocaleDateString` no idioma ativo (mesma técnica do GoalForm
 * do mobile). Função só de apresentação — a lógica de decisão é pura/testada.
 */
function CadenceText({ goal }: { goal: GoalResponse }) {
  const { t, i18n } = useTranslation();
  const desc = cadenceDescriptor(goal);

  if (desc.kind === 'weekdays') {
    if (desc.weekdays.length === 0) return <>{t('goal.cadence.weekdays')}</>;
    const names = desc.weekdays.map((idx) => weekdayShort(idx, i18n.language));
    return <>{names.join(', ')}</>;
  }
  if (desc.kind === 'period') {
    return (
      <>
        {desc.times ?? '?'}× / {t(`goal.period.${desc.period}`)}
      </>
    );
  }
  if (desc.kind === 'target') {
    if (desc.targetValue == null) return <>{t('goal.field.targetValue')}</>;
    return (
      <>
        {desc.targetValue}
        {desc.unit ? ` ${desc.unit}` : ''}
      </>
    );
  }
  return <>—</>;
}

// Domingo (índice 0): 2026-06-07 é um domingo. Igual ao GoalForm do mobile.
function weekdayShort(idx: number, lang: string): string {
  return new Date(2026, 5, 7 + idx).toLocaleDateString(lang, {
    weekday: 'short',
  });
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
