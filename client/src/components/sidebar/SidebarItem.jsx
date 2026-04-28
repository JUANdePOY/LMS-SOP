import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import SidebarTooltip from "../ui/Tooltip";

/**
 * SidebarItem
 *
 * @param {{
 *   item: { name: string, path: string, icon: React.ElementType, description?: string },
 *   isCollapsed: boolean
 * }} props
 */
export default function SidebarItem({ item, isCollapsed }) {
  const Icon = item.icon;

  return (
    <SidebarTooltip
      label={item.name}
      description={item.description}
      enabled={isCollapsed}
    >
      <NavLink
        to={item.path}
        end={item.path === "/"}
        className={({ isActive }) =>
          cn(
            // ── Base layout ──────────────────────────────────────
            "relative flex items-center gap-3 rounded-lg px-3 py-2.5 w-full",
            "text-sm font-medium leading-none tracking-[-0.01em]",
            // ── Transition ───────────────────────────────────────
            "transition-all duration-200 ease-out",
            // ── Focus ring ───────────────────────────────────────
            "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",

            // ── INACTIVE ─────────────────────────────────────────
            !isActive && [
              // Light
              "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100",
              // Dark
              "dark:text-neutral-400 dark:hover:text-neutral-50 dark:hover:bg-neutral-800",
              // Scale nudge on hover
              "hover:scale-[1.015]",
            ],

            // ── ACTIVE ───────────────────────────────────────────
            isActive && [
              // Light
              "text-neutral-900 bg-neutral-100",
              // Dark
              "dark:text-neutral-50 dark:bg-neutral-800",
              // Left indicator bar via before pseudo-element
              "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
              "before:h-[18px] before:w-0.5 before:rounded-full",
              "before:bg-indigo-500 dark:before:bg-indigo-400",
            ],

            // Collapsed: center icon
            isCollapsed && "justify-center px-0"
          )
        }
      >
        {({ isActive }) => (
          <>
            {/* ── Icon ──────────────────────────────────────────── */}
            <span
              className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center",
                "transition-colors duration-200",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-neutral-400 dark:text-neutral-500"
              )}
            >
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
            </span>

            {/* ── Label (hidden when collapsed) ─────────────────── */}
            {!isCollapsed && (
              <span className="truncate">{item.name}</span>
            )}

            {/* ── Active dot for collapsed mode ─────────────────── */}
            {isCollapsed && isActive && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
            )}
          </>
        )}
      </NavLink>
    </SidebarTooltip>
  );
}
