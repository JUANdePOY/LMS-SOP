import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Users, BookOpen, FileText, Building, Megaphone, Calendar, Loader2, ListChecks, CheckSquare, Award, Briefcase, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

const CATEGORY_META = {
  users: { label: 'Users', icon: Users, color: 'bg-[rgba(242,92,5,0.12)] text-[var(--color-primary-hover)] dark:bg-[rgba(242,92,5,0.16)] dark:text-[var(--color-primary)]' },
  courses: { label: 'Courses', icon: BookOpen, color: 'bg-success-soft text-[var(--color-success)] dark:bg-success-soft dark:text-[var(--color-success)]' },
  sops: { label: 'SOPs', icon: FileText, color: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
  departments: { label: 'Departments', icon: Building, color: 'bg-warning-soft text-[var(--color-warning)] dark:bg-warning-soft dark:text-[var(--color-warning)]' },
  announcements: { label: 'Announcements', icon: Megaphone, color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300' },
  events: { label: 'Events', icon: Calendar, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300' },
  quizzes: { label: 'Quizzes', icon: ListChecks, color: 'bg-[rgba(19,47,69,0.12)] text-[var(--color-secondary)] dark:bg-[rgba(19,47,69,0.18)] dark:text-[var(--color-secondary)]' },
  tasks: { label: 'Tasks', icon: CheckSquare, color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' },
  certificates: { label: 'Certificates', icon: Award, color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300' },
  businesses: { label: 'Businesses', icon: Briefcase, color: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300' },
  categories: { label: 'Categories', icon: Tag, color: 'bg-danger-soft text-[var(--color-danger)] dark:bg-danger-soft dark:text-[var(--color-danger)]' },
};

function ResultRow({ category, item, onClick }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const title = item.title || item.full_name || item.name || item.business_name || item.code || 'Untitled';
  const subtitle = item.department_name || item.course_title || item.business_code || item.subtitle || item.description || '';

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onClick(category, item)}
      className="flex w-full items-start gap-3 touch-manipulation rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-100 active:bg-neutral-100 dark:hover:bg-neutral-800 dark:active:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-[rgba(242,92,5,0.30)] sm:py-2"
    >
      <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", meta.color)}>
        <Icon size={13} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>
      <span className="mt-0.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
        {meta.label}
      </span>
    </button>
  );
}

export default function GlobalSearch() {
  const { query, setQuery, results, total, isLoading, error, navigateToResult, reset } = useGlobalSearch();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const hasResults = Object.keys(results).length > 0;
  const visibleResults = useMemo(() => {
    const list = [];
    Object.entries(results).forEach(([category, items]) => {
      if (items?.length) list.push([category, items]);
    });
    return list;
  }, [results]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBlurClose = () => {
    setTimeout(() => {
      if (inputRef.current && document.activeElement !== inputRef.current) {
        setOpen(false);
      }
    }, 150);
  };

  const handleNavigate = (category, item) => {
    navigateToResult(category, item);
    setOpen(false);
  };

  const handleClear = () => {
    reset();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "relative flex items-center transition-all duration-200",
          "w-full max-w-xl"
        )}
      >
         <Search
          size={18}
          strokeWidth={1.5}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--header-input-icon)]"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlurClose}
          aria-label="Global search"
          placeholder="Search across the system… (SOPs, courses, users, events)"
          className={cn(
            "peer h-10 w-full rounded-xl",
            "border border-[var(--header-border)] bg-[var(--header-bg-input)]",
            "pl-10 pr-12 py-2 text-base text-[var(--header-input-text)] sm:text-sm",
            "placeholder:text-[var(--header-input-placeholder)]",
            "outline-none transition-all duration-200",
            "shadow-sm",
            "focus:ring-2 focus:ring-[var(--header-input-focus-ring)] focus:border-[var(--color-primary)] focus:shadow-md",
            "dark:focus:ring-[var(--header-input-focus-ring)]"
          )}
        />
        {query ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--header-input-icon)] hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200/30 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <X size={15} />
          </button>
        ) : isLoading ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 size={15} className="animate-spin text-[var(--header-input-icon)]" />
          </div>
        ) : null}
      </div>

      {open && query && (
        <div
          className="fixed inset-0 z-40 bg-black/20 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {open && query && (
        <div
          className={cn(
            "fixed inset-x-0 top-[var(--header-height)] z-50 mt-0 w-auto sm:absolute sm:inset-x-auto sm:top-full sm:mt-1 sm:w-full sm:max-w-lg",
            "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900",
            "shadow-2xl shadow-neutral-200/80 dark:shadow-neutral-950/60",
            "ring-1 ring-neutral-200 dark:ring-neutral-800",
            "overflow-hidden",
            open ? "animate-in zoom-in-95" : "animate-out zoom-out-90"
          )}
        >
          <div className="border-b border-[var(--border)] px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
            Showing up to 12 results per category • {total} total match{total !== 1 ? 'es' : ''}
          </div>

          {error && (
            <div className="p-3 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {isLoading && !hasResults && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-neutral-500 dark:text-neutral-400">
              <Loader2 size={15} className="animate-spin" />
              <span>Searching…</span>
            </div>
          )}

          {!isLoading && !hasResults && !error && (
            <div className="p-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No results found for "{query}"
            </div>
          )}

          {!isLoading && hasResults && (
            <div className="max-h-[70vh] overflow-y-auto py-1 sm:max-h-96">
              {visibleResults.map(([category, items]) => {
                const meta = CATEGORY_META[category];
                const Icon = meta.icon;
                return (
                  <div key={category} className="mb-1">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      <Icon size={12} />
                      {meta.label}
                    </div>
                    <div className="px-1.5">
                      {items.map((item) => (
                        <ResultRow key={item.id} category={category} item={item} onClick={handleNavigate} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
