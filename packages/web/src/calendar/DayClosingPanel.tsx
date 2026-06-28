import type { DayClosingItemResponse } from '@cerebro/shared';
import { checkGoal, getDayClosing, skipGoal } from '@cerebro/shared/client';
import { Button, Card } from '@cerebro/ui';
import { Check, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Ritual "Fechar o dia" no desktop: lista as metas-hábito ainda pendentes de hoje
 * (`getDayClosing`) e deixa resolver cada uma — fiz (`checkGoal`), não fiz porque…
 * (`skipGoal` com motivo) ou deixa pra lá (some da lista, sem evento). Espelha o
 * `DayClosingPage` do mobile e reusa os MESMOS endpoints do shared. Tom anti-culpa:
 * "sem cobrança", "deixa pra lá", "amanhã recomeça em branco". `onResolved` avisa o
 * pai (a aba Calendário) para ele recarregar o detalhe/grade do dia.
 */
export function DayClosingPanel({ onResolved }: { onResolved?: () => void }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<DayClosingItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDayClosing()
      .then((data) => {
        if (!cancelled) setItems(data.pending);
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

  function remove(goalId: string) {
    setItems((prev) => prev.filter((i) => i.goalId !== goalId));
    onResolved?.();
  }

  async function handleDid(goalId: string) {
    await checkGoal(goalId);
    remove(goalId);
  }

  async function handleSkip(goalId: string, reason: string) {
    await skipGoal(goalId, reason);
    remove(goalId);
  }

  if (loading) {
    return <p className="text-sm text-muted">{t('agenda.loading')}</p>;
  }

  if (error) {
    return <p className="text-sm text-muted">{t('dayClosing.error')}</p>;
  }

  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 py-6 text-center"
        data-testid="day-closed"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-accent">
          <Moon size={22} strokeWidth={1.75} />
        </span>
        <p className="font-display text-lg font-semibold text-fg">
          {t('dayClosing.closed.title')}
        </p>
        <p className="text-sm text-muted">{t('dayClosing.closed.body')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5" data-testid="day-closing-list">
      {items.map((item) => (
        <DayClosingCard
          key={item.goalId}
          item={item}
          onDid={(id) => void handleDid(id)}
          onSkip={(id, reason) => void handleSkip(id, reason)}
          onLetGo={remove}
        />
      ))}
    </div>
  );
}

function DayClosingCard({
  item,
  onDid,
  onSkip,
  onLetGo,
}: {
  item: DayClosingItemResponse;
  onDid: (goalId: string) => void;
  onSkip: (goalId: string, reason: string) => void;
  onLetGo: (goalId: string) => void;
}) {
  const { t } = useTranslation();
  const [reasoning, setReasoning] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <Card padding="sm">
      <p className="text-sm font-semibold text-fg">{item.title}</p>
      {item.kind === 'invitation' && (
        <p className="mt-0.5 text-xs text-muted">{t('dayClosing.invitation')}</p>
      )}

      {!reasoning ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => onDid(item.goalId)}
            data-testid={`did-${item.goalId}`}
          >
            <Check size={15} strokeWidth={2.5} />
            {t('dayClosing.action.did')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setReasoning(true)}
            data-testid={`didnt-${item.goalId}`}
          >
            {t('dayClosing.action.didnt')}
          </Button>
          <button
            type="button"
            onClick={() => onLetGo(item.goalId)}
            data-testid={`letgo-${item.goalId}`}
            className="text-xs font-medium text-muted transition-opacity hover:opacity-70"
          >
            {t('dayClosing.action.letGo')}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('dayClosing.reason.placeholder')}
            aria-label={t('dayClosing.reason.placeholder')}
            data-testid={`reason-${item.goalId}`}
            className="h-11 w-full rounded-[var(--radius-card)] border border-subtle bg-raised px-4 text-sm text-fg outline-none placeholder:text-faint"
          />
          <Button
            size="sm"
            onClick={() => onSkip(item.goalId, reason.trim())}
            disabled={!reason.trim()}
            data-testid={`reason-submit-${item.goalId}`}
          >
            {t('dayClosing.reason.confirm')}
          </Button>
        </div>
      )}
    </Card>
  );
}
