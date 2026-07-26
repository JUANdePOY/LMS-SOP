import { THEME_STORAGE_KEY, DARK, LIGHT, SYSTEM } from './constants';

export function loadStoredTheme() {
  if (typeof window === 'undefined') return SYSTEM;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === DARK || stored === LIGHT || stored === SYSTEM) return stored;
  return SYSTEM;
}

export function persistTheme(theme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
