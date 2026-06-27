import { Button, Input } from '@cerebro/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { CreateStudyItemInput } from '../lib/api/endpoints.js';
import { parseQuestions } from '../lib/text-to-doc.js';
import { type PromptRequest, PromptSheet } from './PromptSheet.js';

const studyItemFormSchema = z.object({
  title: z.string().trim().min(1),
  reference: z.string().optional(),
  before: z.string().optional(),
  during: z.string().optional(),
  after: z.string().optional(),
});

type StudyItemFormValues = z.infer<typeof studyItemFormSchema>;

// Cada linha não-vazia do textarea vira uma pergunta.
function toLines(value?: string): string[] {
  return (value ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

interface StudyItemFormProps {
  onSubmit: (body: CreateStudyItemInput) => void;
  submitting?: boolean;
  resourceId?: string;
}

export function StudyItemForm({
  onSubmit,
  submitting,
  resourceId,
}: StudyItemFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudyItemFormValues>({
    resolver: zodResolver(studyItemFormSchema),
    defaultValues: { title: '' },
  });

  const [promptReq, setPromptReq] = useState<PromptRequest | null>(null);
  const watchedTitle = watch('title');
  const watchedReference = watch('reference');

  function openQuestionsPrompt() {
    const title = watchedTitle?.trim();
    if (!title) return;
    setPromptReq({
      skill: 'study.questions',
      context: {
        title,
        reference: watchedReference?.trim() || undefined,
      },
      // Resultado colado vira candidato: preenche os campos do form (editáveis); só
      // persiste quando o usuário salva o item (§9 — nada gravado sem confirmação).
      apply: (text) => {
        const q = parseQuestions(text);
        setValue('before', q.before.join('\n'));
        setValue('during', q.during.join('\n'));
        setValue('after', q.after.join('\n'));
      },
    });
  }

  const submit = handleSubmit((values) => {
    const before = toLines(values.before);
    const during = toLines(values.during);
    const after = toLines(values.after);
    const hasQuestions = before.length || during.length || after.length;
    onSubmit({
      title: values.title.trim(),
      reference: values.reference?.trim() || undefined,
      resourceId: resourceId ?? undefined,
      questions: hasQuestions ? { before, during, after } : undefined,
    });
  });

  const textareaClass =
    'min-h-[64px] w-full rounded-[var(--radius-card)] px-4 py-2.5 text-sm outline-none';
  const textareaStyle = {
    backgroundColor: 'var(--cerebro-raised)',
    color: 'var(--cerebro-fg)',
    border: '1px solid var(--cerebro-border)',
  } as const;

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

      <label className="flex flex-col gap-1.5">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
        >
          {t('study.field.questionsBefore')}
        </span>
        <textarea
          className={textareaClass}
          style={textareaStyle}
          {...register('before')}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
        >
          {t('study.field.questionsDuring')}
        </span>
        <textarea
          className={textareaClass}
          style={textareaStyle}
          {...register('during')}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
        >
          {t('study.field.questionsAfter')}
        </span>
        <textarea
          className={textareaClass}
          style={textareaStyle}
          {...register('after')}
        />
      </label>

      <Button
        type="button"
        variant="secondary"
        onClick={openQuestionsPrompt}
        disabled={!watchedTitle?.trim()}
        data-testid="prompt-study-questions"
      >
        <Sparkles size={16} strokeWidth={1.85} />
        {t('ai.skill.study.questions')}
      </Button>

      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? t('capture.submitting') : t('common.save')}
      </Button>

      <PromptSheet request={promptReq} onClose={() => setPromptReq(null)} />
    </form>
  );
}
