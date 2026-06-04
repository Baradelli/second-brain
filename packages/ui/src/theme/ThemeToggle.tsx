import { Moon, Sun } from 'lucide-react';

import { useTheme } from './ThemeContext.js';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 hover:bg-[var(--cerebro-accent-soft)] active:scale-90"
      style={{ color: 'var(--cerebro-muted)' }}
    >
      {isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  );
}
