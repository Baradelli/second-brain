import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-medium"
            style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full resize-none rounded-[var(--radius-card)] px-4 py-3 text-sm leading-relaxed outline-none transition-all duration-150 placeholder:text-[var(--cerebro-faint)] focus:ring-2 ${className}`}
          style={{
            backgroundColor: 'var(--cerebro-raised)',
            color: 'var(--cerebro-fg)',
            border: error
              ? '1px solid var(--cerebro-error)'
              : '1px solid var(--cerebro-border)',
            // @ts-expect-error custom property
            '--tw-ring-color': 'var(--cerebro-accent-soft)',
          }}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: 'var(--cerebro-error)' }}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
