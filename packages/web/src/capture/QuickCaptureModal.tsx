import { createCapture } from '@cerebro/shared/client';
import { Button } from '@cerebro/ui';
import { Check, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface QuickCaptureModalProps {
  open: boolean;
  onClose: () => void;
  /** Chamado após uma captura salva com sucesso (ex.: atualizar a agenda). */
  onCaptured?: () => void;
}

/**
 * Captura rápida global do desktop — um modal leve e descartável, NÃO uma aba:
 * capturar tem que ser um passo só. Espelha o `QuickCaptureForm` do mobile
 * (textarea + envio) reusando o mesmo endpoint `createCapture`. O web é só online
 * (sem fila offline, conforme escopo do CLAUDE.md): chama `createCapture` direto.
 *
 * Teclado: Esc fecha; Cmd/Ctrl+Enter envia. Ao salvar, limpa, confirma com um
 * toque sutil (tom anti-culpa) e fecha — sem cerimônia.
 */
export function QuickCaptureModal({
  open,
  onClose,
  onCaptured,
}: QuickCaptureModalProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justCaptured, setJustCaptured] = useState(false);
  const [error, setError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ao abrir, foca o textarea e limpa qualquer estado residual.
  useEffect(() => {
    if (!open) return;
    setError(false);
    setJustCaptured(false);
    const id = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(
    () => () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    },
    [],
  );

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      await createCapture(trimmed);
      setText('');
      setJustCaptured(true);
      onCaptured?.();
      // Confirmação breve, depois some sozinho — fechamos o modal logo após.
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => {
        setJustCaptured(false);
        onClose();
      }, 700);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[12vh]"
      role="presentation"
      onMouseDown={(e) => {
        // Clique no backdrop (fora do cartão) fecha.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('capture.section.input')}
        className="w-full max-w-xl rounded-[var(--radius-card-lg)] border border-subtle bg-card shadow-xl"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            void handleSubmit();
          }
        }}
      >
        <div className="flex items-center justify-between border-b border-subtle px-5 py-3">
          <h2 className="font-display text-base font-semibold text-fg">
            {t('capture.section.input')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('shell.close')}
            className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-raised"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="px-5 py-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('capture.placeholder')}
            aria-label={t('capture.placeholder')}
            rows={5}
            className="w-full resize-none bg-transparent text-[0.95rem] leading-relaxed text-fg outline-none placeholder:text-faint"
          />
          {error && (
            <p className="mt-2 text-xs text-error" role="alert">
              {t('common.error')}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-subtle px-5 py-3">
          <span
            className="flex items-center gap-1.5 text-xs font-medium text-accent transition-opacity duration-300"
            style={{ opacity: justCaptured ? 1 : 0 }}
            aria-live="polite"
          >
            <Check size={14} strokeWidth={2.5} />
            {t('capture.success')}
          </span>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!text.trim() || submitting}
            size="sm"
          >
            {submitting ? t('capture.submitting') : t('capture.submit')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
