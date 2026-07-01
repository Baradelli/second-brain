import { type CreateStudyItemInput } from '@cerebro/shared/client';
import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

const schema = z.object({
  title: z.string().trim().min(1),
  reference: z.string().optional(),
});
type Values = z.infer<typeof schema>;

/**
 * Form leve de criação de item de estudo no web (título + referência). As
 * perguntas-guia e o fichamento são editados depois, na aba do item — por isso
 * o web não usa o `StudyItemForm` do mobile (que carrega o fluxo de IA/PromptSheet).
 */
export function StudyItemCreateForm({
  onSubmit,
  submitting,
  resourceId,
}: {
  onSubmit: (body: CreateStudyItemInput) => void;
  submitting?: boolean;
  resourceId?: string;
}) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: '' },
  });

  const submit = handleSubmit((v) =>
    onSubmit({
      title: v.title.trim(),
      reference: v.reference?.trim() || undefined,
      resourceId: resourceId ?? undefined,
    }),
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h2
        className="font-display text-lg font-semibold"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('study.create.title')}
      </h2>
      <Input
        label={t('study.field.title')}
        error={errors.title ? t('study.field.titleRequired') : undefined}
        {...register('title')}
      />
      <Input label={t('study.field.reference')} {...register('reference')} />
      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? t('capture.submitting') : t('common.save')}
      </Button>
    </form>
  );
}
