import { DARK, LIGHT } from './constants';

export function getSystemPreference() {
  if (typeof window === 'undefined') return LIGHT;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
}

export function createSystemListener(callback) {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (event) => {
    callback(event.matches ? DARK : LIGHT);
  };

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
