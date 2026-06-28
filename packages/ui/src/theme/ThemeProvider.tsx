import { type ReactNode, useEffect, useState } from 'react';

import { type Theme, ThemeContext } from './ThemeContext.js';

const STORAGE_KEY = 'cerebro-theme';

function getInitialTheme(defaultTheme?: Theme): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    if (defaultTheme) return defaultTheme;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches)
      return 'dark';
  } catch {
    // localStorage or matchMedia unavailable
  }
  return 'light';
}

export function ThemeProvider({
  children,
  defaultTheme,
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(() =>
    getInitialTheme(defaultTheme),
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  function toggle() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
