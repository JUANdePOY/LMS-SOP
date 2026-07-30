import { useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeContext } from './ThemeContext';
import { DARK, LIGHT, SYSTEM } from './constants';
import { loadStoredTheme, persistTheme } from './localStorage';
import { getSystemPreference, createSystemListener } from './system';

const THEME_CYCLE = [LIGHT, DARK, SYSTEM];

export function ThemeProvider({ children, defaultTheme = SYSTEM }) {
  const [theme, setThemeState] = useState(() => loadStoredTheme() || defaultTheme);

  const resolvedTheme = useMemo(() => {
    if (theme === SYSTEM) return getSystemPreference();
    return theme;
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === DARK) {
      root.classList.add(DARK);
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove(DARK);
      root.style.colorScheme = 'light';
    }
  }, [resolvedTheme]);

  useEffect(() => {
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== SYSTEM) return;
    return createSystemListener((preference) => {
      const root = document.documentElement;
      if (preference === DARK) {
        root.classList.add(DARK);
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove(DARK);
        root.style.colorScheme = 'light';
      }
    });
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === SYSTEM) {
        const sysPref = getSystemPreference();
        return sysPref === DARK ? LIGHT : DARK;
      }
      const idx = THEME_CYCLE.indexOf(prev);
      return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isDark: resolvedTheme === DARK,
      toggleTheme,
      setTheme,
    }),
    [theme, resolvedTheme, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
