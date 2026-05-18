import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AirbasePageHeader
 * Shared header with breadcrumb, title, description, and optional action slot.
 *
 * @param {{
 *   icon: React.ElementType,
 *   title: string,
 *   description: string,
 *   actions?: React.ReactNode,
 *   breadcrumbs?: { label: string, path?: string }[]
 * }} props
 */
export default function AirbasePageHeader({ icon: Icon, title, description, actions, breadcrumbs }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Breadcrumb */}
      {breadcrumbs && (
        <nav className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-600">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={10} />}
              {crumb.path ? (
                <Link
                  to={crumb.path}
                  className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-neutral-600 dark:text-neutral-400 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40">
            <Icon size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none truncate">
              {title}
            </h1>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-500 line-clamp-1">
              {description}
            </p>
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
