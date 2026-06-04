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
      className={`flex flex-col items-center justify-center gap-3 px-6 py-10 text-center ${className}`}
    >
      {icon && (
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            color: 'var(--cerebro-muted)',
            backgroundColor: 'var(--cerebro-accent-soft)',
          }}
        >
          {icon}
        </span>
      )}
      <p
        className="font-display text-[0.95rem]"
        style={{ color: 'var(--cerebro-fg)' }}
      >
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
