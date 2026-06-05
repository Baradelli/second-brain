import { type ReactNode, useEffect } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

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
        className="fixed inset-x-0 bottom-0 z-[70] px-2 pb-2"
        style={{
          transform: open ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="mx-auto max-w-lg px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3"
          style={{
            backgroundColor: 'var(--cerebro-card)',
            border: '1px solid var(--cerebro-border)',
            borderRadius: 'var(--radius-card-lg)',
            boxShadow: 'var(--cerebro-shadow-lg)',
          }}
        >
          <div
            className="mx-auto mb-4 h-1 w-9 rounded-full"
            style={{ backgroundColor: 'var(--cerebro-border-strong)' }}
            aria-hidden
          />
          {children}
        </div>
      </div>
    </>
  );
}
