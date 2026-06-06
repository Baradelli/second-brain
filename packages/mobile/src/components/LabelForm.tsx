import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { LabelBody } from '../lib/api/endpoints.js';

// Paleta fixa (~8 cores) — legíveis nos dois temas.
export const LABEL_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
] as const;

const labelFormSchema = z.object({ name: z.string().trim().min(1) });
type LabelFormValues = z.infer<typeof labelFormSchema>;

interface LabelFormProps {
  initial?: { name: string; color: string | null };
  onSubmit: (body: LabelBody) => void;
  submitting?: boolean;
}

// Labels são planas (sem hierarquia) — decisão do dono. parentId não é usado.
export function LabelForm({ initial, onSubmit, submitting }: LabelFormProps) {
  const { t } = useTranslation();
  const [color, setColor] = useState<string | null>(initial?.color ?? null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LabelFormValues>({
    resolver: zodResolver(labelFormSchema),
    defaultValues: { name: initial?.name ?? '' },
  });

  const submit = handleSubmit((values) => {
    onSubmit({ name: values.name.trim(), color });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h2
        className="font-display text-lg font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {initial ? t('labels.edit') : t('labels.create')}
      </h2>

      <Input
        label={t('labels.field.name')}
        error={errors.name ? t('labels.nameRequired') : undefined}
        {...register('name')}
      />

      {/* Cor (paleta fixa) */}
      <div className="flex flex-col gap-1.5">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
        >
          {t('labels.field.color')}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setColor(null)}
            aria-label={t('labels.color.none')}
            data-testid="label-color-none"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[0.625rem]"
            style={{
              border: '1px solid var(--cerebro-border)',
              color: 'var(--cerebro-muted)',
              outline:
                color === null ? '2px solid var(--cerebro-accent)' : 'none',
              outlineOffset: '2px',
            }}
          >
            —
          </button>
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              data-testid={`label-color-${c}`}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                backgroundColor: c,
                outline: color === c ? '2px solid var(--cerebro-fg)' : 'none',
                outlineOffset: '2px',
              }}
            >
              {color === c && <Check size={14} strokeWidth={3} color="#fff" />}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? t('capture.submitting') : t('common.save')}
      </Button>
    </form>
  );
}
