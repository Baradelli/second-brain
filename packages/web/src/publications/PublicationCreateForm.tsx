import type { PublicationFormatInput } from '@cerebro/shared';
import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { formatLabelKey, PUBLICATION_FORMATS } from './publication-display.js';

const schema = z.object({
  title: z.string().trim().min(1),
  format: z.enum(
    PUBLICATION_FORMATS as [PublicationFormatInput, ...PublicationFormatInput[]],
  ),
});
type Values = z.infer<typeof schema>;

/**
 * Form de criação de publicação no web (título + formato). A FONTE (uma Note
 * vazia auto-originada) é criada por quem chama, no Salvar — ver PublicationsSection.
 */
export function PublicationCreateForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (values: Values) => void;
  submitting?: boolean;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', format: 'linkedin' },
  });

  const submit = handleSubmit((v) =>
    onSubmit({ title: v.title.trim(), format: v.format }),
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h2
        className="font-display text-lg font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('publish.new')}
      </h2>
      <Input
        label={t('publish.field.title')}
        error={errors.title ? t('library.create.titleRequired') : undefined}
        {...register('title')}
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-fg opacity-80">
          {t('publish.field.format')}
        </span>
        <select
          className="h-11 w-full rounded-[var(--radius-card)] border border-subtle bg-raised px-4 text-sm text-fg outline-none"
          {...register('format')}
        >
          {PUBLICATION_FORMATS.map((f) => (
            <option key={f} value={f}>
              {t(formatLabelKey(f))}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? t('capture.submitting') : t('common.save')}
      </Button>
    </form>
  );
}
