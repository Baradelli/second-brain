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
          className={`w-full resize-none rounded-2xl px-3 py-2.5 text-sm leading-relaxed outline-none transition-shadow duration-150 placeholder:opacity-40 focus:ring-2 ${className}`}
          style={{
            backgroundColor: 'var(--cerebro-card)',
            color: 'var(--cerebro-fg)',
            border: error ? '1px solid #ef4444' : '1px solid var(--cerebro-border)',
            // @ts-expect-error custom property
            '--tw-ring-color': 'rgba(109,93,252,0.35)',
          }}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
