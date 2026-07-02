import {
  AI_SKILL_KEYS,
  type AiSkillKey,
  type AssistantFormValues,
  buildContext,
  candidateNoteTitle,
  type PublicationFormatInput,
  requiredFieldsFilled,
  skillDescriptor,
} from '@cerebro/shared';
import { createNote, textToDoc } from '@cerebro/shared/client';
import {
  Button,
  Input,
  type PromptRequest,
  PromptSheet,
  Textarea,
} from '@cerebro/ui';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const PUBLICATION_FORMATS: PublicationFormatInput[] = [
  'linkedin',
  'substack',
  'blog',
  'lesson',
  'video',
];

/**
 * Hub do Assistente (IA) no mobile — Tarefa 82. Espelha o AssistantTab do web:
 * escolha uma das 7 skills, preencha o contexto que ela pede e abra o
 * PromptSheet (copiar prompt no modo cheap; "Gerar com IA" no conectado). Toda
 * saída é candidato: o resultado confirmado vira uma Note aberta no editor (§9).
 * Os campos por skill vêm dos descritores puros do shared (skill-forms).
 */
export function AssistantPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [skill, setSkill] = useState<AiSkillKey>('study.questions');
  const [values, setValues] = useState<AssistantFormValues>({});
  const [promptReq, setPromptReq] = useState<PromptRequest | null>(null);

  const descriptor = skillDescriptor(skill);
  const ready = requiredFieldsFilled(skill, values);

  function setField(name: keyof AssistantFormValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function openPrompt() {
    if (!ready) return;
    const context = buildContext(skill, values);
    const title = candidateNoteTitle(values, t(`ai.skill.${skill}`));
    setPromptReq({
      skill,
      context,
      apply: async (text) => {
        const note = await createNote({
          type: 'NOTE',
          doc: textToDoc(text),
          title,
        });
        navigate(`/editor/${note.id}`);
      },
    });
  }

  const fieldStyle = {
    backgroundColor: 'var(--cerebro-raised)',
    color: 'var(--cerebro-fg)',
    border: '1px solid var(--cerebro-border)',
  } as const;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 pt-8 pb-24">
      <h1
        className="mb-2 font-display text-[1.75rem] font-semibold leading-tight"
        style={{ color: 'var(--cerebro-fg)' }}
      >
        {t('nav.assistant')}
      </h1>
      <p
        className="mb-4 text-sm leading-relaxed"
        style={{ color: 'var(--cerebro-muted)' }}
      >
        {t('ai.pasteHint')}
      </p>

      {/* Escolha da skill */}
      <div className="mb-5 flex flex-wrap gap-2">
        {AI_SKILL_KEYS.map((key) => {
          const active = key === skill;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSkill(key);
                setValues({});
              }}
              data-testid={`skill-${key}`}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: active
                  ? 'var(--cerebro-accent-soft)'
                  : 'transparent',
                color: active
                  ? 'var(--cerebro-accent)'
                  : 'var(--cerebro-muted)',
                border: active
                  ? '1px solid transparent'
                  : '1px solid var(--cerebro-border)',
              }}
            >
              {t(`ai.skill.${key}`)}
            </button>
          );
        })}
      </div>

      {/* Campos da skill (descritores puros do shared) */}
      <div className="flex flex-col gap-3">
        {descriptor?.fields.map((field) => {
          const label = t(`assistant.field.${field.name}`);
          const value = (values[field.name] as string | undefined) ?? '';
          if (field.format) {
            return (
              <label key={field.name} className="flex flex-col gap-1.5">
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--cerebro-muted)' }}
                >
                  {label}
                </span>
                <select
                  value={value}
                  onChange={(e) => setField(field.name, e.target.value)}
                  data-testid={`field-${field.name}`}
                  aria-label={label}
                  className="h-10 w-full rounded-[var(--radius-card)] px-3 text-sm outline-none"
                  style={fieldStyle}
                >
                  <option value="" disabled>
                    —
                  </option>
                  {PUBLICATION_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {t(`publish.format.${f}`)}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          if (field.multiline) {
            return (
              <Textarea
                key={field.name}
                label={label}
                value={value}
                onChange={(e) => setField(field.name, e.target.value)}
                rows={4}
                data-testid={`field-${field.name}`}
              />
            );
          }
          return (
            <Input
              key={field.name}
              label={label}
              value={value}
              onChange={(e) => setField(field.name, e.target.value)}
              data-testid={`field-${field.name}`}
            />
          );
        })}

        <Button
          onClick={openPrompt}
          disabled={!ready}
          data-testid="assistant-open-prompt"
        >
          <Sparkles size={16} strokeWidth={1.85} />
          {t(`ai.skill.${skill}`)}
        </Button>
      </div>

      <PromptSheet request={promptReq} onClose={() => setPromptReq(null)} />
    </main>
  );
}
