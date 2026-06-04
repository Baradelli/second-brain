import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = {
  sm: 'p-3.5',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`rounded-[var(--radius-card)] ${paddingMap[padding]} ${className}`}
      style={{
        backgroundColor: 'var(--cerebro-card)',
        border: '1px solid var(--cerebro-border)',
        boxShadow: 'var(--cerebro-shadow-sm)',
      }}
    >
      {children}
    </div>
  );
}
