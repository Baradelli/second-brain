import { useEffect, type ReactNode } from 'react';

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
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 shadow-2xl"
        style={{
          backgroundColor: 'var(--cerebro-card)',
          borderTopLeftRadius: '1.375rem',
          borderTopRightRadius: '1.375rem',
          padding: '1.5rem',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 250ms ease-out',
        }}
      >
        <div
          className="mx-auto mb-4 h-1 w-10 rounded-full"
          style={{ backgroundColor: 'var(--cerebro-border)' }}
          aria-hidden
        />
        {children}
      </div>
    </>
  );
}
