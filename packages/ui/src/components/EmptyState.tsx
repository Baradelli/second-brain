import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  body?: string;
  className?: string;
}

export function EmptyState({ icon, title, body, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}
    >
      {icon && (
        <span className="text-4xl opacity-30">{icon}</span>
      )}
      <p className="text-sm font-medium" style={{ color: 'var(--cerebro-fg)', opacity: 0.7 }}>
        {title}
      </p>
      {body && (
        <p
          className="max-w-xs text-xs leading-relaxed"
          style={{ color: 'var(--cerebro-muted)' }}
        >
          {body}
        </p>
      )}
    </div>
  );
}
