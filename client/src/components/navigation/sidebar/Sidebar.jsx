import { Link } from "react-router-dom";
import { Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarItem from "./SidebarItem";
import { menuItems } from "@/config/menuItems";

/**
 * Sidebar
 * - Collapsed (64px) by default — icons only
 * - Expands (260px) on mouse enter via parent AppLayout
 * - No toggle button — purely hover driven
 *
 * @param {{ expanded: boolean, onMouseEnter: fn, onMouseLeave: fn }} props
 */
export default function Sidebar({ expanded = false, onMouseEnter, onMouseLeave }) {
  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        // Layout
        "fixed inset-y-0 left-0 z-40 flex flex-col",
        // Width transition
        "transition-all duration-300 ease-out",
        expanded ? "w-[260px]" : "w-[64px]",
        // Colors
        "bg-white border-r border-neutral-200",
        "dark:bg-neutral-950 dark:border-neutral-800",
        // Shadow appears when expanded (hover) for depth
        expanded && "shadow-xl shadow-black/5 dark:shadow-black/30"
      )}
    >
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center",
          "border-b border-neutral-200 dark:border-neutral-800",
          expanded ? "px-4" : "justify-center px-0"
        )}
      >
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2.5 overflow-hidden",
            !expanded && "justify-center"
          )}
        >
          {/* PAF roundel logo mark */}
          <span className={cn(
            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            "bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700",
            "shadow-md shadow-blue-900/30 dark:shadow-blue-900/50",
            "ring-2 ring-blue-500/30 dark:ring-blue-400/20"
          )}>
            <span className="absolute inset-0 rounded-full border border-white/10" />
            <span className="relative z-10 text-[9px] font-black tracking-[0.05em] text-white leading-none select-none">
              PAF
            </span>
            <span className="absolute bottom-[5px] text-[6px] text-yellow-300 leading-none select-none">★</span>
          </span>

          {/* Brand text — only visible when expanded */}
          <div className={cn(
            "flex flex-col leading-tight overflow-hidden",
            "transition-all duration-200",
            expanded ? "opacity-100 w-auto" : "opacity-0 w-0 pointer-events-none"
          )}>
            <span className="text-[15px] font-black tracking-[0.12em] text-neutral-900 dark:text-neutral-50 leading-none whitespace-nowrap">
              P.A.F.R
            </span>
            <span className="mt-[3px] text-[9px] font-medium tracking-[0.06em] uppercase text-neutral-400 dark:text-neutral-500 whitespace-nowrap leading-none">
              Philippine Air Force Reservists
            </span>
          </div>
        </Link>
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-none"
        aria-label="Main navigation"
      >
        {/* Section label — fades in when expanded */}
        <div className={cn(
          "overflow-hidden transition-all duration-200",
          expanded ? "max-h-6 opacity-100 mb-1.5" : "max-h-0 opacity-0 mb-0"
        )}>
        </div>

        <ul className="space-y-0.5" role="list">
          {menuItems.map((item) => (
            <li key={item.path}>
              <SidebarItem item={item} isCollapsed={!expanded} />
            </li>
          ))}
        </ul>

        <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />

        {/* System label */}
        <div className={cn(
          "overflow-hidden transition-all duration-200",
          expanded ? "max-h-6 opacity-100 mb-1.5" : "max-h-0 opacity-0 mb-0"
        )}>
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-600 whitespace-nowrap">
            System
          </p>
        </div>

        <ul className="space-y-0.5" role="list">
          <li>
            <SidebarItem
              item={{ name: "Alerts", path: "/alerts", icon: Bell, description: "Notifications" }}
              isCollapsed={!expanded}
            />
          </li>
          <li>
            <SidebarItem
              item={{ name: "Settings", path: "/settings", icon: Settings, description: "Preferences" }}
              isCollapsed={!expanded}
            />
          </li>
        </ul>
      </nav>

      {/* ── User footer ───────────────────────────────────────── */}
      <div
        className={cn(
          "flex shrink-0 items-center",
          "border-t border-neutral-200 dark:border-neutral-800",
          "bg-neutral-50 dark:bg-neutral-900",
          "transition-all duration-300",
          expanded ? "gap-3 px-4 py-3" : "justify-center p-3"
        )}
      >
        {/* Avatar */}
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">
          CO
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white dark:border-neutral-900 bg-emerald-400" />
        </span>

        {/* Name — fades in when expanded */}
        <div className={cn(
          "flex flex-col leading-tight overflow-hidden",
          "transition-all duration-200",
          expanded ? "opacity-100 w-auto" : "opacity-0 w-0 pointer-events-none"
        )}>
          <span className="truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
            Commanding Officer
          </span>
          <span className="truncate text-[11px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
            CO Admin
          </span>
        </div>
      </div>
    </aside>
  );
}