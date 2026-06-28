import type {
  PublicationFormatInput,
  PublicationResponse,
  PublicationSourceTypeInput,
} from '@cerebro/shared';
import { createPublication } from '@cerebro/shared/client';
import { BottomSheet, Button } from '@cerebro/ui';
import { Check, Megaphone } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FORMATS: PublicationFormatInput[] = [
  'linkedin',
  'substack',
  'blog',
  'lesson',
  'video',
];

export interface PublishTriggerProps {
  /** Fonte do estudo a virar publicação. */
  source: {
    type: PublicationSourceTypeInput;
    id: string;
    title: string;
  };
  /** Renderiza um botão compacto (chip) em vez do botão padrão. */
  compact?: boolean;
  /** Chamado após criar a publicação (idea). */
  onCreated?: (publication: PublicationResponse) => void;
  className?: string;
}

// Gatilho "Ensinar para Reter" (Bloco O): convida — sem cobrar — a transformar um
// artefato de estudo num rascunho de publicação (stage='idea'). Tom anti-culpa (plano §1):
// é convite, nunca obrigação; o rascunho fica nas ideias até o dono decidir.
export function PublishTrigger({
  source,
  compact = false,
  onCreated,
  className = '',
}: PublishTriggerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  async function handlePick(format: PublicationFormatInput) {
    setCreating(true);
    try {
      const publication = await createPublication({
        sourceType: source.type,
        sourceId: source.id,
        format,
        title: source.title,
      });
      setCreated(true);
      onCreated?.(publication);
      // Mostra a confirmação por um instante e fecha.
      window.setTimeout(() => {
        setOpen(false);
        setCreated(false);
      }, 1100);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="publish-trigger"
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${className}`}
          style={{
            backgroundColor: 'var(--cerebro-accent-soft)',
            color: 'var(--cerebro-accent)',
          }}
        >
          <Megaphone size={14} strokeWidth={2} />
          {t('publish.trigger')}
        </button>
      ) : (
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          data-testid="publish-trigger"
          className={className}
        >
          <Megaphone size={16} strokeWidth={1.85} />
          {t('publish.trigger')}
        </Button>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        {created ? (
          <div
            className="flex flex-col items-center gap-2 py-6 text-center"
            data-testid="publish-created"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--cerebro-accent-soft)',
                color: 'var(--cerebro-accent)',
              }}
              aria-hidden
            >
              <Check size={22} strokeWidth={2} />
            </span>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--cerebro-fg)' }}
            >
              {t('publish.created')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className="font-display text-lg font-semibold"
                style={{ color: 'var(--cerebro-fg)' }}
              >
                {t('publish.sheet.title')}
              </h2>
              <p
                className="mt-1 text-sm leading-relaxed"
                style={{ color: 'var(--cerebro-muted)' }}
              >
                {t('publish.invite')}
              </p>
            </div>

            <div>
              <h3
                className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--cerebro-muted)' }}
              >
                {t('publish.format.label')}
              </h3>
              <div className="flex flex-col gap-2">
                {FORMATS.map((format) => (
                  <button
                    key={format}
                    type="button"
                    disabled={creating}
                    onClick={() => void handlePick(format)}
                    data-testid={`publish-format-${format}`}
                    className="rounded-[var(--radius-card)] px-4 py-3 text-left text-sm font-semibold transition-transform duration-150 active:scale-[0.99] disabled:opacity-45"
                    style={{
                      backgroundColor: 'var(--cerebro-raised)',
                      border: '1px solid var(--cerebro-border)',
                      color: 'var(--cerebro-fg)',
                    }}
                  >
                    {t(`publish.format.${format}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
