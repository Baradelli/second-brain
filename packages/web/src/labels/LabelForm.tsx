import type { LabelBody } from '@cerebro/shared/client';
import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

// Paleta fixa (~8 cores) — legíveis nos dois temas. Mesma do mobile; a lógica de
// negócio (validação/persistência) é compartilhada via `@cerebro/shared/client`.
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
  onCancel?: () => void;
  submitting?: boolean;
}

// Labels são planas (sem hierarquia) — decisão do dono. parentId não é usado.
export function LabelForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: LabelFormProps) {
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
      <h2 className="font-display text-lg font-semibold text-fg">
        {initial ? t('labels.edit') : t('labels.create')}
      </h2>

      <Input
        label={t('labels.field.name')}
        error={errors.name ? t('labels.nameRequired') : undefined}
        autoFocus
        {...register('name')}
      />

      {/* Cor (paleta fixa) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-fg opacity-80">
          {t('labels.field.color')}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setColor(null)}
            aria-label={t('labels.color.none')}
            data-testid="label-color-none"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[0.625rem] text-muted"
            style={{
              border: '1px solid var(--cerebro-border)',
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

      <div className="mt-1 flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? t('capture.submitting') : t('common.save')}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
