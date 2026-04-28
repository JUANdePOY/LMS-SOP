import { useState, useEffect, useCallback } from "react";

const THEME_KEY = "theme";
const DARK = "dark";
const LIGHT = "light";

/**
 * useTheme
 * Manages light/dark theme with localStorage persistence.
 * Applies "dark" class to <html> element for Tailwind's class strategy.
 *
 * @returns {{ currentTheme: string, isDark: boolean, toggleTheme: () => void }}
 */
export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Read from localStorage; fallback to system preference, then light
    if (typeof window === "undefined") return LIGHT;
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === DARK || stored === LIGHT) return stored;
    // Respect OS preference on first visit
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK : LIGHT;
  });

  // Sync class on <html> and persist whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (currentTheme === DARK) {
      root.classList.add(DARK);
    } else {
      root.classList.remove(DARK);
    }
    localStorage.setItem(THEME_KEY, currentTheme);
  }, [currentTheme]);

  const toggleTheme = useCallback(() => {
    setCurrentTheme((prev) => (prev === DARK ? LIGHT : DARK));
  }, []);

  return {
    currentTheme,
    isDark: currentTheme === DARK,
    toggleTheme,
  };
}
