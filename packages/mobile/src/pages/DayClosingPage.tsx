import type { DayClosingItemResponse } from '@cerebro/shared';
import { Button, Card } from '@cerebro/ui';
import { Check, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { checkGoal, getDayClosing, skipGoal } from '../lib/api/endpoints.js';

export function DayClosingPage() {
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
  }

  async function handleDid(goalId: string) {
    await checkGoal(goalId);
    remove(goalId);
  }

  async function handleSkip(goalId: string, reason: string) {
    await skipGoal(goalId, reason);
    remove(goalId);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <header className="mb-6">
        <h1
          className="font-display text-[1.75rem] font-semibold leading-tight"
          style={{ color: 'var(--cerebro-fg)' }}
        >
          {t('dayClosing.title')}
        </h1>
        <p
          className="mt-2 text-[0.95rem] italic leading-relaxed"
          style={{ fontFamily: 'Fraunces, serif', color: 'var(--cerebro-muted)' }}
        >
          {t('dayClosing.subtitle')}
        </p>
      </header>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('agenda.loading')}
        </p>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
          {t('dayClosing.error')}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div
          className="mt-8 flex flex-col items-center gap-3 text-center"
          data-testid="day-closed"
        >
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'var(--cerebro-accent-soft)',
              color: 'var(--cerebro-accent)',
            }}
          >
            <Moon size={22} strokeWidth={1.75} />
          </span>
          <p
            className="font-display text-lg font-semibold"
            style={{ color: 'var(--cerebro-fg)' }}
          >
            {t('dayClosing.closed.title')}
          </p>
          <p className="text-sm" style={{ color: 'var(--cerebro-muted)' }}>
            {t('dayClosing.closed.body')}
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-2.5" data-testid="day-closing-list">
          {items.map((item) => (
            <DayClosingCard
              key={item.goalId}
              item={item}
              onDid={handleDid}
              onSkip={handleSkip}
              onLetGo={remove}
            />
          ))}
        </div>
      )}
    </main>
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
      <p
        className="text-sm font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {item.title}
      </p>
      {item.kind === 'invitation' && (
        <p className="mt-0.5 text-xs" style={{ color: 'var(--cerebro-muted)' }}>
          {t('dayClosing.invitation')}
        </p>
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
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--cerebro-muted)' }}
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
            className="h-11 w-full rounded-[var(--radius-card)] px-4 text-sm outline-none"
            style={{
              backgroundColor: 'var(--cerebro-raised)',
              color: 'var(--cerebro-fg)',
              border: '1px solid var(--cerebro-border)',
            }}
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
