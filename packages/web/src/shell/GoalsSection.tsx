import type { ArchivedGoalResponse, GoalResponse } from '@cerebro/shared';
import {
  createGoal,
  listActiveGoals,
  listArchivedGoals,
} from '@cerebro/shared/client';
import { EmptyState } from '@cerebro/ui';
import { Plus, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { goalLabel } from '../goals/goal-display.js';
import { useTabs } from '../tabs/tabs-context.js';

/**
 * Lista de objetivos dentro da seção "Objetivos" do explorador. Busca os
 * objetivos ativos, mostra título + dica de tipo, respeita a árvore guarda-chuva
 * (filhos indentados sob o pai quando o pai está na lista), abre o objetivo numa
 * aba ao clicar e oferece "Novo objetivo" (cria um HABIT com o título placeholder
 * do mobile e abre a aba). Arquivados ficam num bloco recolhível. Espelha
 * `ResourcesSection`.
 */
export function GoalsSection() {
  const { t } = useTranslation();
  const { openTab } = useTabs();
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);

  const [showArchived, setShowArchived] = useState(false);
  const [archived, setArchived] = useState<ArchivedGoalResponse[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listActiveGoals()
      .then((data) => {
        if (!cancelled) setGoals(data);
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

  function open(goal: Pick<GoalResponse, 'id' | 'title'>) {
    openTab({
      kind: 'goal',
      id: goal.id,
      title: goalLabel(goal, t('goals.create.title')),
    });
  }

  async function handleNewGoal() {
    if (creating) return;
    setCreating(true);
    try {
      // Default do mobile (GoalForm): tipo HABIT, título placeholder.
      const goal = await createGoal({
        title: t('goals.create.title'),
        type: 'HABIT',
      });
      setGoals((prev) => [goal, ...prev]);
      open(goal);
    } catch {
      setError(true);
    } finally {
      setCreating(false);
    }
  }

  async function toggleArchived() {
    const next = !showArchived;
    setShowArchived(next);
    if (next) {
      try {
        setArchived(await listArchivedGoals());
      } catch {
        setArchived([]);
      }
    }
  }

  // Ordena em árvore: cada raiz seguida dos seus filhos (1 nível, como o mobile).
  const tree = buildGoalTree(goals);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => void handleNewGoal()}
        disabled={creating}
        className="mb-1 flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-accent transition-colors hover:bg-card disabled:opacity-50"
      >
        <Plus size={15} strokeWidth={2} />
        <span className="truncate">{t('goals.new')}</span>
      </button>

      {loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('agenda.loading')}</p>
      )}

      {error && !loading && (
        <p className="px-2 py-2 text-xs text-muted">{t('goals.error')}</p>
      )}

      {!loading && !error && goals.length === 0 && (
        <EmptyState title={t('goals.empty')} className="py-6" />
      )}

      {!loading && !error && goals.length > 0 && (
        <ul className="flex flex-col">
          {tree.map(({ goal, depth }) => (
            <li key={goal.id}>
              <button
                type="button"
                onClick={() => open(goal)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card"
                style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
              >
                <Target
                  size={15}
                  strokeWidth={1.75}
                  className="shrink-0 text-muted"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {goalLabel(goal, t('goals.create.title'))}
                  </span>
                  <span className="block truncate text-[0.625rem] uppercase tracking-[0.12em] text-faint">
                    {t(`goal.type.${goal.type}`)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void toggleArchived()}
        className="mt-1 px-2 py-1.5 text-left text-xs font-medium text-accent transition-colors hover:underline"
      >
        {showArchived ? t('goals.archived.hide') : t('goals.archived.show')}
      </button>

      {showArchived && (
        <ul className="flex flex-col">
          {archived.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted">
              {t('goals.archived.empty')}
            </p>
          ) : (
            archived.map((goal) => (
              <li key={goal.id}>
                <button
                  type="button"
                  onClick={() => open(goal)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-card"
                >
                  <Target
                    size={15}
                    strokeWidth={1.75}
                    className="shrink-0 text-faint"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">
                    {goalLabel(goal, t('goals.create.title'))}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Achata os objetivos numa lista ordenada raiz→filhos (1 nível de indentação),
 * honrando o `parentId` quando o pai está presente. Raízes sem pai (ou cujo pai
 * não está na lista) ficam no topo na ordem original.
 */
function buildGoalTree(
  goals: GoalResponse[],
): { goal: GoalResponse; depth: number }[] {
  const byParent = new Map<string | null, GoalResponse[]>();
  const ids = new Set(goals.map((g) => g.id));
  for (const goal of goals) {
    const parent =
      goal.parentId && ids.has(goal.parentId) ? goal.parentId : null;
    const bucket = byParent.get(parent);
    if (bucket) bucket.push(goal);
    else byParent.set(parent, [goal]);
  }
  const out: { goal: GoalResponse; depth: number }[] = [];
  for (const root of byParent.get(null) ?? []) {
    out.push({ goal: root, depth: 0 });
    for (const child of byParent.get(root.id) ?? []) {
      out.push({ goal: child, depth: 1 });
    }
  }
  return out;
}
