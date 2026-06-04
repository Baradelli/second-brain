import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

const paddingMap = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`rounded-[1rem] border bg-[--cerebro-card] ${paddingMap[padding]} ${className}`}
      style={{ borderColor: 'var(--cerebro-border)' }}
    >
      {children}
    </div>
  );
}
