import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--cerebro-accent)',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(109,93,252,0.25)',
  },
  secondary: {
    backgroundColor: 'var(--cerebro-card)',
    color: 'var(--cerebro-fg)',
    border: '1px solid var(--cerebro-border)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--cerebro-fg)',
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-xl px-3 text-xs font-semibold',
  md: 'h-10 rounded-2xl px-4 text-sm font-semibold',
  lg: 'h-12 rounded-2xl px-6 text-base font-semibold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', style, ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] ${sizeClasses[size]} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
