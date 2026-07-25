import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../useTheme';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }) {
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  const Icon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Theme: ${theme}`}
      className={cn(
        'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100',
        'dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800',
        'transition-colors duration-150',
        className
      )}
    >
      <Icon size={18} />
      {theme === 'system' && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center">
          <span className="text-[8px] leading-none" aria-hidden="true">S</span>
        </span>
      )}
    </button>
  );
}
