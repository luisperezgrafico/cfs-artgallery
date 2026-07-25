'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'dark' | 'light';

// Source of truth is the `data-theme` attribute on <html> (set pre-paint by an
// inline script in layout.tsx and persisted to localStorage). This component
// only flips it and mirrors the current value in its icon.
function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

const ThemeToggle: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => {
  const [theme, setTheme] = useState<Theme>('dark');

  // Sync icon to the actual attribute after mount (avoids hydration mismatch).
  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private mode / storage disabled — the attribute still applies for this session */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      style={style}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
