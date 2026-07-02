import {
  type AiRunRequest,
  type AiSkillKey,
  buildPrompt,
  type DifferenceMapContext,
  type ExplainContext,
  type FichamentoFeedbackContext,
  type PromptContext,
  type PromptLocale,
  type PublishDraftContext,
  type QuizContext,
  type SocraticContext,
  type StudyQuestionsContext,
} from '@cerebro/shared';
import { getSettings, runAi } from '@cerebro/shared/client';
import { BottomSheet, Button } from '@cerebro/ui';
import { Check, ClipboardCopy, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Pedido controlado: a página guarda o estado e abre a folha com a skill + contexto já
// resolvidos (o contexto pode exigir um fetch antes, ex.: texto do fichamento).
export interface PromptRequest {
  skill: AiSkillKey;
  context: PromptContext;
  // Aplica o resultado colado (já revisado pelo usuário). Sem isso, o passo "colar" some.
  // Persistência é responsabilidade do chamador — sempre após confirmação (§9).
  apply?: (pastedText: string) => Promise<void> | void;
}

function build(req: PromptRequest, locale: PromptLocale) {
  // O contexto chega na união ampla; cada skill casa com o seu tipo na borda.
  switch (req.skill) {
    case 'study.questions':
      return buildPrompt(
        'study.questions',
        req.context as StudyQuestionsContext,
        locale,
      );
    case 'study.fichamento_feedback':
      return buildPrompt(
        'study.fichamento_feedback',
        req.context as FichamentoFeedbackContext,
        locale,
      );
    case 'study.quiz':
      return buildPrompt('study.quiz', req.context as QuizContext, locale);
    case 'study.explain':
      return buildPrompt(
        'study.explain',
        req.context as ExplainContext,
        locale,
      );
    case 'study.socratic':
      return buildPrompt(
        'study.socratic',
        req.context as SocraticContext,
        locale,
      );
    case 'study.difference_map':
      return buildPrompt(
        'study.difference_map',
        req.context as DifferenceMapContext,
        locale,
      );
    case 'publish.draft':
      return buildPrompt(
        'publish.draft',
        req.context as PublishDraftContext,
        locale,
      );
    default:
      return null;
  }
}

export function PromptSheet({
  request,
  onClose,
}: {
  request: PromptRequest | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [showSystem, setShowSystem] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState('');
  const [applying, setApplying] = useState(false);
  const [aiMode, setAiMode] = useState<'cheap' | 'connected'>('cheap');
  const [running, setRunning] = useState(false);
  const [runErr, setRunErr] = useState(false);

  const locale: PromptLocale = i18n.language === 'en' ? 'en' : 'pt';
  const built = request ? build(request, locale) : null;
  const fullPrompt = built ? `${built.system}\n\n${built.user}` : '';

  // Descobre o modo do agente quando a folha abre (define se o botão "Gerar com IA" aparece).
  useEffect(() => {
    if (!request) return;
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
  }, [request]);

  function close() {
    setPasted('');
    setShowSystem(false);
    setCopied(false);
    setRunErr(false);
    onClose();
  }

  // Modo conectado: roda o prompt no servidor e despeja o resultado no textarea editável —
  // segue exatamente o fluxo de prévia + confirmação do modo cheap (§9: candidato a confirmar).
  async function generate() {
    if (!request) return;
    setRunning(true);
    setRunErr(false);
    try {
      const { text } = await runAi({
        skill: request.skill,
        context: request.context,
        locale,
      } as AiRunRequest);
      setPasted(text);
    } catch {
      setRunErr(true);
    } finally {
      setRunning(false);
    }
  }

  async function applyPasted() {
    if (!request?.apply || !pasted.trim()) return;
    setApplying(true);
    try {
      await request.apply(pasted);
      setPasted('');
      close();
    } finally {
      setApplying(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullPrompt);
    } catch {
      // Fallback para contextos sem Clipboard API (http, permissões): seleção manual.
      const ta = document.createElement('textarea');
      ta.value = fullPrompt;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* sem clipboard — o usuário copia manualmente do bloco visível */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const blockStyle = {
    backgroundColor: 'var(--cerebro-raised)',
    color: 'var(--cerebro-fg)',
    border: '1px solid var(--cerebro-border)',
  } as const;

  return (
    <BottomSheet open={request !== null} onClose={close}>
      {built && (
        <div className="flex flex-col gap-4">
          <div>
            <h2
              className="font-display text-lg font-semibold"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {t(`ai.skill.${built.skill}`)}
            </h2>
            <p
              className="mt-1 text-sm leading-relaxed"
              style={{ color: 'var(--cerebro-muted)' }}
            >
              {t('ai.pasteHint')}
            </p>
          </div>

          <pre
            data-testid="prompt-user"
            className="max-h-64 overflow-auto whitespace-pre-wrap rounded-[var(--radius-card)] px-3 py-2.5 text-xs leading-relaxed"
            style={blockStyle}
          >
            {built.user}
          </pre>

          <div>
            <button
              type="button"
              onClick={() => setShowSystem((s) => !s)}
              data-testid="prompt-system-toggle"
              className="text-xs font-semibold"
              style={{ color: 'var(--cerebro-accent)' }}
            >
              {showSystem ? t('ai.systemHide') : t('ai.systemToggle')}
            </button>
            {showSystem && (
              <pre
                data-testid="prompt-system"
                className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-card)] px-3 py-2.5 text-xs leading-relaxed"
                style={blockStyle}
              >
                {built.system}
              </pre>
            )}
          </div>

          <Button onClick={() => void copy()} data-testid="prompt-copy">
            {copied ? (
              <Check size={16} strokeWidth={2} />
            ) : (
              <ClipboardCopy size={16} strokeWidth={1.85} />
            )}
            {copied ? t('ai.copied') : t('ai.copy')}
          </Button>

          {request?.apply && (
            <div
              className="flex flex-col gap-2 border-t pt-4"
              style={{ borderColor: 'var(--cerebro-border)' }}
            >
              <h3
                className="text-sm font-medium"
                style={{ color: 'var(--cerebro-fg)' }}
              >
                {t('ai.paste.label')}
              </h3>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--cerebro-muted)' }}
              >
                {t('ai.paste.hint')}
              </p>
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
              {runErr && (
                <p
                  className="text-xs"
                  style={{
                    color: 'var(--cerebro-error, var(--cerebro-accent))',
                  }}
                >
                  {t('ai.runError')}
                </p>
              )}
              <textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder={t('ai.paste.placeholder')}
                data-testid="prompt-paste-input"
                className="min-h-[120px] w-full rounded-[var(--radius-card)] px-3 py-2.5 text-sm outline-none"
                style={blockStyle}
              />
              <Button
                onClick={() => void applyPasted()}
                disabled={applying || !pasted.trim()}
                data-testid="prompt-paste-confirm"
              >
                {applying ? t('ai.paste.saving') : t('ai.paste.confirm')}
              </Button>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
