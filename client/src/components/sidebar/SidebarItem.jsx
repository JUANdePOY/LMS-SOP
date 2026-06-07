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
            "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-amber)_60%,transparent)]",

            // ── INACTIVE ─────────────────────────────────────────
            !isActive && [
              "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]",
              // Scale nudge on hover
              "hover:scale-[1.015]",
            ],

            // ── ACTIVE ───────────────────────────────────────────
            isActive && [
              "text-[var(--text-on-sidebar)] bg-[var(--bg-active)]",
              // Left indicator bar via before pseudo-element
              "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
              "before:h-[18px] before:w-0.5 before:rounded-full",
              "before:bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]",
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
                  ? "text-[var(--text-on-sidebar)]"
                  : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)]"
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
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]" />
            )}
          </>
        )}
      </NavLink>
    </SidebarTooltip>
  );
}
