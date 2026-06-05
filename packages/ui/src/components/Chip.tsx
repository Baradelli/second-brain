import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  variant?: 'default' | 'accent';
  className?: string;
}

export function Chip({
  children,
  variant = 'default',
  className = '',
}: ChipProps) {
  const styles =
    variant === 'accent'
      ? {
          backgroundColor: 'var(--cerebro-accent-soft)',
          color: 'var(--cerebro-accent)',
        }
      : {
          backgroundColor: 'transparent',
          color: 'var(--cerebro-muted)',
          border: '1px solid var(--cerebro-border)',
        };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-tight ${className}`}
      style={styles}
    >
      {children}
    </span>
  );
}

export { Chip as LabelChip };
