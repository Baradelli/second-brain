import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { CreateResourceBody } from '../lib/api/endpoints.js';
import { LabelPicker } from './LabelPicker.js';

const RESOURCE_TYPES = [
  'book',
  'course',
  'video',
  'article',
  'podcast',
  'other',
] as const;

const resourceFormSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(RESOURCE_TYPES),
  url: z.string().optional(),
  author: z.string().optional(),
  description: z.string().optional(),
});

type ResourceFormValues = z.infer<typeof resourceFormSchema>;

interface ResourceFormProps {
  onSubmit: (body: CreateResourceBody) => void;
  submitting?: boolean;
  defaultTitle?: string;
}

export function ResourceForm({
  onSubmit,
  submitting,
  defaultTitle,
}: ResourceFormProps) {
  const { t } = useTranslation();
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: { type: 'book', title: defaultTitle ?? '' },
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      title: values.title.trim(),
      type: values.type,
      url: values.url?.trim() || undefined,
      author: values.author?.trim() || undefined,
      description: values.description?.trim() || undefined,
      labelIds: labelIds.length ? labelIds : undefined,
    });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h2
        className="font-display text-lg font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('library.create.title')}
      </h2>

      <Input
        label={t('resource.field.title')}
        error={errors.title ? t('library.create.titleRequired') : undefined}
        {...register('title')}
      />

      <label className="flex flex-col gap-1.5">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
        >
          {t('resource.field.type')}
        </span>
        <select
          className="h-11 w-full rounded-[var(--radius-card)] px-4 text-sm outline-none"
          style={{
            backgroundColor: 'var(--cerebro-raised)',
            color: 'var(--cerebro-fg)',
            border: '1px solid var(--cerebro-border)',
          }}
          {...register('type')}
        >
          {RESOURCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`resource.type.${type}`)}
            </option>
          ))}
        </select>
      </label>

      <Input label={t('resource.field.author')} {...register('author')} />
      <Input label={t('resource.field.url')} {...register('url')} />

      <LabelPicker value={labelIds} onChange={setLabelIds} />

      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? t('capture.submitting') : t('common.save')}
      </Button>
    </form>
  );
}
