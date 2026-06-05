import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { CreateGoalBody } from '../lib/api/endpoints.js';

const GOAL_TYPES = ['HABIT', 'TARGET', 'PROJECT', 'UMBRELLA'] as const;
const PERIODS = ['day', 'week', 'month'] as const;

const goalFormSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(GOAL_TYPES),
  period: z.enum(PERIODS).optional(),
  timesPerPeriod: z.coerce.number().optional(),
  targetValue: z.coerce.number().optional(),
  unit: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

// Domingo (índice 0) localizado: 2026-06-07 é um domingo.
function weekdayNarrow(idx: number, lang: string): string {
  return new Date(2026, 5, 7 + idx).toLocaleDateString(lang, {
    weekday: 'narrow',
  });
}

interface GoalFormProps {
  onSubmit: (body: CreateGoalBody) => void;
  submitting?: boolean;
  defaultTitle?: string;
}

export function GoalForm({
  onSubmit,
  submitting,
  defaultTitle,
}: GoalFormProps) {
  const { t, i18n } = useTranslation();
  const [cadence, setCadence] = useState<'weekdays' | 'period'>('weekdays');
  const [weekdays, setWeekdays] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: { type: 'HABIT', title: defaultTitle ?? '' },
  });

  const type = watch('type');

  const submit = handleSubmit((values) => {
    const base: CreateGoalBody = {
      title: values.title.trim(),
      type: values.type,
    };
    if (values.type === 'HABIT') {
      if (cadence === 'weekdays') base.weekdays = weekdays;
      else {
        base.period = values.period ?? 'week';
        base.timesPerPeriod = values.timesPerPeriod;
      }
    } else if (values.type === 'TARGET' || values.type === 'PROJECT') {
      base.targetValue = values.targetValue;
      base.unit = values.unit?.trim() || undefined;
    }
    onSubmit(base);
  });

  function toggleWeekday(idx: number) {
    setWeekdays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx],
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h2
        className="font-display text-lg font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('goals.create.title')}
      </h2>

      <Input
        label={t('goal.field.title')}
        error={errors.title ? t('goals.create.titleRequired') : undefined}
        {...register('title')}
      />

      <Field label={t('goal.field.type')}>
        <select
          className={selectClass}
          style={selectStyle}
          {...register('type')}
        >
          {GOAL_TYPES.map((gt) => (
            <option key={gt} value={gt}>
              {t(`goal.type.${gt}`)}
            </option>
          ))}
        </select>
      </Field>

      {type === 'HABIT' && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <CadenceToggle
              active={cadence === 'weekdays'}
              onClick={() => setCadence('weekdays')}
              label={t('goal.cadence.weekdays')}
            />
            <CadenceToggle
              active={cadence === 'period'}
              onClick={() => setCadence('period')}
              label={t('goal.cadence.period')}
            />
          </div>

          {cadence === 'weekdays' ? (
            <div className="flex gap-1.5" data-testid="weekday-picker">
              {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleWeekday(idx)}
                  data-testid={`weekday-${idx}`}
                  className="h-9 w-9 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: weekdays.includes(idx)
                      ? 'var(--cerebro-accent-soft)'
                      : 'transparent',
                    color: weekdays.includes(idx)
                      ? 'var(--cerebro-accent)'
                      : 'var(--cerebro-muted)',
                    border: '1px solid var(--cerebro-border)',
                  }}
                >
                  {weekdayNarrow(idx, i18n.language)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <Field label={t('goal.field.period')}>
                <select
                  className={selectClass}
                  style={selectStyle}
                  {...register('period')}
                >
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {t(`goal.period.${p}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Input
                label={t('goal.field.timesPerPeriod')}
                type="number"
                {...register('timesPerPeriod')}
              />
            </div>
          )}
        </div>
      )}

      {(type === 'TARGET' || type === 'PROJECT') && (
        <div className="flex gap-2">
          <Input
            label={t('goal.field.targetValue')}
            type="number"
            {...register('targetValue')}
          />
          <Input label={t('goal.field.unit')} {...register('unit')} />
        </div>
      )}

      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? t('capture.submitting') : t('common.save')}
      </Button>
    </form>
  );
}

const selectClass =
  'h-11 w-full rounded-[var(--radius-card)] px-4 text-sm outline-none';
const selectStyle = {
  backgroundColor: 'var(--cerebro-raised)',
  color: 'var(--cerebro-fg)',
  border: '1px solid var(--cerebro-border)',
} as const;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span
        className="text-xs font-medium"
        style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function CadenceToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-full px-3 py-1.5 text-xs font-semibold"
      style={{
        backgroundColor: active ? 'var(--cerebro-accent-soft)' : 'transparent',
        color: active ? 'var(--cerebro-accent)' : 'var(--cerebro-muted)',
        border: '1px solid var(--cerebro-border)',
      }}
    >
      {label}
    </button>
  );
}
