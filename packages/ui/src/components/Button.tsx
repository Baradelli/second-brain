import { type ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--cerebro-accent)',
    color: 'var(--cerebro-on-accent)',
    boxShadow: 'var(--cerebro-shadow-sm)',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: 'var(--cerebro-fg)',
    border: '1px solid var(--cerebro-border-strong)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--cerebro-muted)',
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-full px-4 text-xs font-semibold',
  md: 'h-11 rounded-full px-5 text-sm font-semibold',
  lg: 'h-12 rounded-full px-6 text-base font-semibold',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', className = '', style, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 tracking-tight transition-all duration-150 disabled:pointer-events-none disabled:opacity-45 hover:brightness-[1.04] active:scale-[0.97] ${sizeClasses[size]} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
