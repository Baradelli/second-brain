import type { NoteScope, NoteType } from '@cerebro/shared';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from './Button.js';
import { Input } from './Input.js';

const NOTE_TYPES: NoteType[] = [
  'NOTE',
  'STUDY_NOTE',
  'DEVOTIONAL',
  'REFLECTION',
];
const NOTE_SCOPES: NoteScope[] = ['DAY', 'WEEK', 'MONTH', 'YEAR'];

// STUDY_NOTE usa a chave i18n 'study'; os demais batem com o lowercase do enum.
const TYPE_I18N: Record<NoteType, string> = {
  NOTE: 'editor.type.note',
  STUDY_NOTE: 'editor.type.study',
  DEVOTIONAL: 'editor.type.devotional',
  REFLECTION: 'editor.type.reflection',
};

export interface NoteFormValues {
  title?: string;
  type: NoteType;
  scope: NoteScope;
}

interface NoteFormProps {
  onSubmit: (body: NoteFormValues) => void;
  submitting?: boolean;
  defaultType?: NoteType;
  defaultScope?: NoteScope;
}

/**
 * Formulário compartilhado de criação de Note. Escolhe tipo + escopo + título
 * (opcional) ANTES de criar — o conteúdo em si é escrito no editor depois. A
 * criação real fica com quem chama (adiciona `doc` vazio e persiste no Salvar).
 */
export function NoteForm({
  onSubmit,
  submitting,
  defaultType = 'NOTE',
  defaultScope = 'DAY',
}: NoteFormProps) {
  const { t } = useTranslation();
  const { register, handleSubmit } = useForm<NoteFormValues>({
    defaultValues: { title: '', type: defaultType, scope: defaultScope },
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      title: values.title?.trim() || undefined,
      type: values.type,
      scope: values.scope,
    });
  });

  const selectClass =
    'h-11 w-full rounded-[var(--radius-card)] px-4 text-sm outline-none';
  const selectStyle = {
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
        {t('notes.create.title')}
      </h2>

      <Input label={t('note.field.title')} {...register('title')} />

      <label className="flex flex-col gap-1.5">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
        >
          {t('note.field.type')}
        </span>
        <select className={selectClass} style={selectStyle} {...register('type')}>
          {NOTE_TYPES.map((nt) => (
            <option key={nt} value={nt}>
              {t(TYPE_I18N[nt])}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
        >
          {t('shell.prop.scope')}
        </span>
        <select
          className={selectClass}
          style={selectStyle}
          {...register('scope')}
        >
          {NOTE_SCOPES.map((s) => (
            <option key={s} value={s}>
              {t(`shell.prop.scope.${s}`)}
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
