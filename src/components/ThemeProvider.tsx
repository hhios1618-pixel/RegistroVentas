'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: Theme;
};

const STORAGE_KEY = 'fenix-os-theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getPreferredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  root.style.colorScheme = theme;
  root.setAttribute('data-theme', theme);

  const body = document.body;
  if (body) {
    body.classList.remove('theme-light', 'theme-dark');
    body.classList.add(`theme-${theme}`);
  }
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [systemTheme, setSystemTheme] = useState<Theme>(() => (typeof window === 'undefined' ? 'dark' : window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  const isMounted = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const updateSystem = (event: MediaQueryListEvent | MediaQueryList) => {
      const next = event.matches ? 'light' : 'dark';
      setSystemTheme(next);
    };

    updateSystem(mq);

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', updateSystem as (event: MediaQueryListEvent) => void);
      return () => mq.removeEventListener('change', updateSystem as (event: MediaQueryListEvent) => void);
    }

    mq.addListener(updateSystem as (event: MediaQueryListEvent) => void);
    return () => mq.removeListener(updateSystem as (event: MediaQueryListEvent) => void);
  }, []);

  useEffect(() => {
    const preferred = getPreferredTheme();
    setThemeState(preferred);
    applyTheme(preferred);
    isMounted.current = true;
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      window.localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isMounted.current) {
      return;
    }
    applyTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme, systemTheme }),
    [theme, setTheme, toggleTheme, systemTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
