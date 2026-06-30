import { Button } from '@cerebro/ui';
import { AlertTriangle, Archive, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

export type ConfirmTone = 'danger' | 'default';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Ação confirmada. Se rejeitar, o diálogo mostra o erro e permanece aberto. */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  /** `danger` para exclusão permanente (irreversível); `default` para arquivar. */
  tone?: ConfirmTone;
  /**
   * Mensagem amigável (já traduzida) para quando a ação for bloqueada pelo
   * servidor (HTTP 409 — ex.: item referenciado). Substitui o erro genérico.
   */
  blockedMessage?: string;
}

/**
 * Modal de confirmação reutilizável (web/desktop). Usado tanto para arquivar
 * (reversível) quanto para excluir de vez (irreversível, tom `danger`).
 *
 * Padrão herdado do QuickCaptureModal: portal, role=dialog/aria-modal, Esc e
 * clique no backdrop cancelam, foco gerenciado. A ação confirmada pode ser
 * assíncrona — enquanto roda, os botões ficam desabilitados; se falhar, o erro
 * aparece e o diálogo continua aberto (o pai controla o fechamento no sucesso).
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = 'default',
  blockedMessage,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Ao abrir: limpa estado e foca o botão Cancelar (default seguro p/ ação
  // destrutiva — Enter não dispara a exclusão sem querer).
  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    const id = requestAnimationFrame(() => cancelRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      // Sucesso: o pai desmonta o diálogo (fecha + atualiza a lista).
    } catch (err) {
      const blocked = err instanceof Error && err.message.includes('HTTP 409');
      setError(
        blocked ? (blockedMessage ?? t('common.error')) : t('common.error'),
      );
      setSubmitting(false);
    }
  }

  const isDanger = tone === 'danger';
  const Icon = isDanger ? AlertTriangle : Archive;

  return createPortal(
    <div
      className="cb-backdrop fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[18vh]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="cb-dialog w-full max-w-md rounded-[var(--radius-card-lg)] border border-subtle bg-card shadow-xl"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !submitting) {
            e.stopPropagation();
            onCancel();
          }
        }}
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: isDanger
                ? 'color-mix(in srgb, var(--cerebro-error) 12%, transparent)'
                : 'var(--cerebro-accent-soft)',
              color: isDanger
                ? 'var(--cerebro-error)'
                : 'var(--cerebro-accent)',
            }}
            aria-hidden
          >
            <Icon size={18} strokeWidth={2} />
          </span>
          <div className="flex-1 pt-0.5">
            <h2
              id="confirm-title"
              className="font-display text-base font-semibold text-fg"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            aria-label={t('common.cancel')}
            className="-mr-1 flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-raised disabled:opacity-40"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <p
          id="confirm-body"
          className="px-5 pb-1 pl-[4.25rem] pt-2 text-sm leading-relaxed text-muted"
        >
          {body}
        </p>

        {error && (
          <p
            role="alert"
            className="mx-5 mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--cerebro-error) 10%, transparent)',
              color: 'var(--cerebro-error)',
            }}
          >
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-subtle px-5 py-3">
          <Button
            ref={cancelRef}
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={() => void handleConfirm()}
            disabled={submitting}
            style={
              isDanger
                ? {
                    backgroundColor: 'var(--cerebro-error)',
                    color: '#ffffff',
                  }
                : undefined
            }
          >
            {submitting ? t('common.working') : confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
