import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * `sheet` (padrão): cartão estreito centralizado subindo de baixo — ideal no
   * mobile. `full`: faixa de largura total ancorada embaixo (altura conforme o
   * conteúdo, não a tela toda), com o conteúdo centralizado numa coluna legível
   * — usado no desktop (web), onde o cartão estreito parecia pequeno demais.
   */
  size?: 'sheet' | 'full';
}

export function BottomSheet({
  open,
  onClose,
  children,
  size = 'sheet',
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const full = size === 'full';

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-[60] transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(24, 20, 15, 0.40)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={
          full
            ? 'fixed inset-x-0 bottom-0 z-[70]'
            : 'fixed inset-x-0 bottom-0 z-[70] px-2 pb-2'
        }
        style={{
          transform: open ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className={
            full
              ? 'max-h-[85vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3'
              : 'mx-auto max-w-lg px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3'
          }
          style={{
            backgroundColor: 'var(--cerebro-card)',
            border: full ? 'none' : '1px solid var(--cerebro-border)',
            borderTop: full ? '1px solid var(--cerebro-border)' : undefined,
            borderRadius: full
              ? 'var(--radius-card-lg) var(--radius-card-lg) 0 0'
              : 'var(--radius-card-lg)',
            boxShadow: 'var(--cerebro-shadow-lg)',
          }}
        >
          {full ? (
            <div className="mx-auto w-full max-w-2xl px-6">
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                  style={{ color: 'var(--cerebro-muted)' }}
                >
                  <X size={18} strokeWidth={1.85} />
                </button>
              </div>
              {children}
            </div>
          ) : (
            <>
              <div
                className="mx-auto mb-4 h-1 w-9 rounded-full"
                style={{ backgroundColor: 'var(--cerebro-border-strong)' }}
                aria-hidden
              />
              {children}
            </>
          )}
        </div>
      </div>
    </>
  );
}
