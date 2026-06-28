import {
  AI_SKILL_KEYS,
  type AiSkillKey,
  buildPrompt,
  type FichamentoFeedbackContext,
  type PromptLocale,
  type PublicationFormatInput,
  type PublishDraftContext,
  type QuizContext,
  type StudyQuestionsContext,
} from '@cerebro/shared';
import {
  createNote,
  getSettings,
  runAi,
  textToDoc,
} from '@cerebro/shared/client';
import { Button, Input, Textarea } from '@cerebro/ui';
import { Check, ClipboardCopy, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTabs } from '../tabs/tabs-context.js';
import {
  aiRunBody,
  type AssistantFormValues,
  buildContext,
  candidateNoteTitle,
  requiredFieldsFilled,
  skillDescriptor,
} from './assistant-skills.js';

const PUBLICATION_FORMATS: PublicationFormatInput[] = [
  'linkedin',
  'substack',
  'blog',
  'lesson',
  'video',
];

/**
 * Aba do Assistente (IA) no desktop. Espelha o fluxo do `PromptSheet`/AssistantPage
 * do mobile, mas como um hub: o usuário ESCOLHE uma das 4 skills, preenche o
 * contexto que ela pede, e então:
 *
 * - Modo CHEAP (custo zero): mostramos o prompt montado (via `buildPrompt` do
 *   shared — NÃO reescrevemos prompt aqui) com um botão de copiar; o usuário cola
 *   no seu próprio ChatGPT/Claude e traz o resultado de volta.
 * - Modo CONECTADO: além do copiar, oferecemos "Gerar com IA" (`runAi`), que roda
 *   no servidor e despeja o texto no mesmo campo de revisão.
 *
 * Em QUALQUER modo o resultado é um CANDIDATO (§9 do CLAUDE.md): nada é gravado
 * até o usuário revisar e confirmar. Ao confirmar, salvamos o texto como uma NOTE
 * candidata (mesmo `saveAsNote` do mobile: `textToDoc` → `createNote`) e abrimos a
 * aba da nota para edição. O modo (cheap/connected) vem do Settings, igual ao
 * mobile. A construção do prompt e o mapeamento skill→contexto vivem no shared e
 * em `assistant-skills.ts` (puro, testado) — esta tela só faz a fiação.
 */
export function AssistantTab() {
  const { t, i18n } = useTranslation();
  const { openTab } = useTabs();

  const [skill, setSkill] = useState<AiSkillKey | null>(null);
  const [values, setValues] = useState<AssistantFormValues>({});
  const [showSystem, setShowSystem] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState('');
  const [applying, setApplying] = useState(false);
  const [aiMode, setAiMode] = useState<'cheap' | 'connected'>('cheap');
  const [running, setRunning] = useState(false);
  const [runErr, setRunErr] = useState(false);

  const locale: PromptLocale = i18n.language === 'en' ? 'en' : 'pt';

  // Descobre o modo do agente (define se "Gerar com IA" aparece). Igual ao mobile.
  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (!cancelled) setAiMode(s.aiMode);
      })
      .catch(() => {
        if (!cancelled) setAiMode('cheap');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const descriptor = skill ? skillDescriptor(skill) : undefined;
  const ready = skill ? requiredFieldsFilled(skill, values) : false;

  // Só monta o prompt quando os obrigatórios estão preenchidos (senão buildContext lança).
  const built = skill && ready ? buildPromptFor(skill, values, locale) : null;
  const fullPrompt = built ? `${built.system}\n\n${built.user}` : '';

  function pickSkill(next: AiSkillKey) {
    setSkill(next);
    setValues({});
    setPasted('');
    setShowSystem(false);
    setCopied(false);
    setRunErr(false);
  }

  function setField(name: keyof AssistantFormValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullPrompt);
    } catch {
      // Fallback p/ contextos sem Clipboard API: seleção manual via textarea oculto.
      const ta = document.createElement('textarea');
      ta.value = fullPrompt;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* sem clipboard — o usuário copia do bloco visível */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  // Modo conectado: roda no servidor e despeja o resultado no campo de revisão —
  // segue o MESMO gate de confirmação do modo cheap (§9: ainda é candidato).
  async function generate() {
    if (!skill || !ready) return;
    setRunning(true);
    setRunErr(false);
    try {
      const { text } = await runAi(aiRunBody(skill, values, locale));
      setPasted(text);
    } catch {
      setRunErr(true);
    } finally {
      setRunning(false);
    }
  }

  // Confirmação explícita: só agora algo é gravado. Salva como NOTE candidata e
  // abre a aba da nota para o usuário revisar/editar (mesmo destino do mobile).
  async function applyCandidate() {
    if (!skill || !pasted.trim()) return;
    setApplying(true);
    try {
      const title = candidateNoteTitle(values, t(`ai.skill.${skill}`));
      const note = await createNote({
        type: 'NOTE',
        doc: textToDoc(pasted),
        title,
      });
      openTab({ kind: 'note', id: note.id, title });
      setPasted('');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col overflow-y-auto px-6 py-6">
      <h1 className="font-display text-2xl font-semibold text-fg">
        {t('assistant.title')}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {t('assistant.intro')}
      </p>

      {/* 1. Escolha da skill */}
      <section className="mt-6">
        <h2 className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
          {t('assistant.skillPicker')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {AI_SKILL_KEYS.map((key) => {
            const active = key === skill;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickSkill(key)}
                data-testid={`skill-${key}`}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'border-transparent bg-[var(--cerebro-accent-soft)] text-accent'
                    : 'border-subtle text-muted hover:bg-card'
                }`}
              >
                <Sparkles size={15} strokeWidth={1.85} aria-hidden />
                {t(`ai.skill.${key}`)}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Campos do contexto da skill escolhida */}
      {skill && descriptor && (
        <section className="mt-6 flex flex-col gap-3">
          <h2 className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
            {t('assistant.fieldsTitle')}
          </h2>
          {descriptor.fields.map((field) => {
            const label = t(`assistant.field.${field.name}`);
            if (field.format) {
              return (
                <label key={field.name} className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-fg opacity-80">
                    {label}
                  </span>
                  <select
                    value={values.format ?? ''}
                    onChange={(e) => setField('format', e.target.value)}
                    data-testid={`field-${field.name}`}
                    className="h-11 rounded-[var(--radius-card)] border border-subtle bg-raised px-3 text-sm text-fg outline-none"
                  >
                    <option value="" disabled>
                      {t('publish.format.label')}
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
                  value={(values[field.name] as string | undefined) ?? ''}
                  onChange={(e) => setField(field.name, e.target.value)}
                  data-testid={`field-${field.name}`}
                  className="min-h-[120px]"
                />
              );
            }
            return (
              <Input
                key={field.name}
                label={label}
                value={(values[field.name] as string | undefined) ?? ''}
                onChange={(e) => setField(field.name, e.target.value)}
                data-testid={`field-${field.name}`}
              />
            );
          })}
        </section>
      )}

      {/* 3. Prompt montado (cheap) + gerar (connected) */}
      {built && (
        <section className="mt-6 flex flex-col gap-3">
          <p className="text-sm leading-relaxed text-muted">
            {aiMode === 'connected'
              ? t('assistant.modeConnected')
              : t('assistant.modeCheap')}
          </p>

          <pre
            data-testid="prompt-user"
            className="max-h-64 overflow-auto whitespace-pre-wrap rounded-[var(--radius-card)] border border-subtle bg-raised px-3 py-2.5 text-xs leading-relaxed text-fg"
          >
            {built.user}
          </pre>

          <div>
            <button
              type="button"
              onClick={() => setShowSystem((s) => !s)}
              data-testid="prompt-system-toggle"
              className="text-xs font-semibold text-accent"
            >
              {showSystem ? t('ai.systemHide') : t('ai.systemToggle')}
            </button>
            {showSystem && (
              <pre
                data-testid="prompt-system"
                className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-card)] border border-subtle bg-raised px-3 py-2.5 text-xs leading-relaxed text-fg"
              >
                {built.system}
              </pre>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void copy()} data-testid="prompt-copy">
              {copied ? (
                <Check size={16} strokeWidth={2} />
              ) : (
                <ClipboardCopy size={16} strokeWidth={1.85} />
              )}
              {copied ? t('ai.copied') : t('ai.copy')}
            </Button>
            {aiMode === 'connected' && (
              <Button
                variant="secondary"
                onClick={() => void generate()}
                disabled={running}
                data-testid="prompt-run"
              >
                <Sparkles size={16} strokeWidth={1.85} />
                {running ? t('ai.running') : t('ai.run')}
              </Button>
            )}
          </div>
          <p className="text-xs leading-relaxed text-muted">
            {t('ai.pasteHint')}
          </p>
          {runErr && <p className="text-xs text-error">{t('ai.runError')}</p>}
        </section>
      )}

      {/* 4. Colar o resultado → candidato → confirmar (gate anti-autosave §9) */}
      {built && (
        <section className="mt-6 flex flex-col gap-2 border-t border-subtle pt-5">
          <h2 className="text-sm font-medium text-fg">{t('ai.paste.label')}</h2>
          <p className="text-xs leading-relaxed text-muted">
            {t('ai.paste.hint')}
          </p>
          <Textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={t('ai.paste.placeholder')}
            data-testid="prompt-paste-input"
            className="min-h-[140px]"
          />
          <Button
            onClick={() => void applyCandidate()}
            disabled={applying || !pasted.trim()}
            data-testid="prompt-paste-confirm"
            className="self-start"
          >
            {applying ? t('ai.paste.saving') : t('ai.paste.confirm')}
          </Button>
        </section>
      )}
    </div>
  );
}

// Constrói o prompt da skill reusando o `buildPrompt` do shared (fonte única dos
// templates). O contexto vem do `buildContext` puro; o cast resolve a união para
// cada overload tipado de `buildPrompt`.
function buildPromptFor(
  skill: AiSkillKey,
  values: AssistantFormValues,
  locale: PromptLocale,
) {
  const context = buildContext(skill, values);
  switch (skill) {
    case 'study.questions':
      return buildPrompt(skill, context as StudyQuestionsContext, locale);
    case 'study.fichamento_feedback':
      return buildPrompt(skill, context as FichamentoFeedbackContext, locale);
    case 'study.quiz':
      return buildPrompt(skill, context as QuizContext, locale);
    case 'publish.draft':
      return buildPrompt(skill, context as PublishDraftContext, locale);
    default:
      return null;
  }
}
