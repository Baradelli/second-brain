import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  variant?: 'default' | 'accent';
  className?: string;
}

export function Chip({ children, variant = 'default', className = '' }: ChipProps) {
  const styles =
    variant === 'accent'
      ? { backgroundColor: 'rgba(109,93,252,0.12)', color: 'var(--cerebro-accent)' }
      : { backgroundColor: 'rgba(128,128,128,0.12)', color: 'var(--cerebro-muted)' };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[0.6875rem] font-medium ${className}`}
      style={styles}
    >
      {children}
    </span>
  );
}

export { Chip as LabelChip };
