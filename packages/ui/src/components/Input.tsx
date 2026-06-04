import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium"
            style={{ color: 'var(--cerebro-fg)', opacity: 0.8 }}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-11 w-full rounded-[var(--radius-card)] px-4 text-sm outline-none transition-all duration-150 placeholder:text-[var(--cerebro-faint)] focus:ring-2 ${className}`}
          style={{
            backgroundColor: 'var(--cerebro-raised)',
            color: 'var(--cerebro-fg)',
            border: error ? '1px solid var(--cerebro-error)' : '1px solid var(--cerebro-border)',
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
Input.displayName = 'Input';
