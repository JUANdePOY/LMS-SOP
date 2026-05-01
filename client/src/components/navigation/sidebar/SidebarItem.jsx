import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarTooltip from "@/components/ui/Tooltip";

function SidebarSubItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.end ?? false}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 w-full",
          "text-[13px] font-medium leading-none tracking-[-0.01em]",
          "transition-all duration-150 ease-out",
          "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
          !isActive && [
            "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100",
            "dark:text-neutral-400 dark:hover:text-neutral-50 dark:hover:bg-neutral-800",
          ],
          isActive && [
            "text-neutral-900 bg-neutral-100",
            "dark:text-neutral-50 dark:bg-neutral-800",
            "before:absolute before:left-[18px] before:top-1/2 before:-translate-y-1/2",
            "before:h-[14px] before:w-0.5 before:rounded-full",
            "before:bg-indigo-500 dark:before:bg-indigo-400",
          ]
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center transition-colors duration-150",
            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-neutral-500"
          )}>
            <Icon size={14} strokeWidth={isActive ? 2.2 : 1.8} />
          </span>
          <span className="truncate">{item.name}</span>
        </>
      )}
    </NavLink>
  );
}

export default function SidebarItem({ item, isCollapsed }) {
  const Icon = item.icon;
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;

  const isChildActive = hasChildren &&
    item.children.some((child) => location.pathname === child.path || location.pathname.startsWith(child.path + "/"));

  const isParentPathActive = location.pathname === item.path ||
    (item.path !== "/" && location.pathname.startsWith(item.path));

  const isParentActive = isParentPathActive || isChildActive;

  const [open, setOpen] = useState(isChildActive);

  // ── Parent item with children ──────────────────────────────────────────────
  if (hasChildren) {
    return (
      <SidebarTooltip label={item.name} description={item.description} enabled={isCollapsed}>
        <div className="w-full">
          <div className={cn(
            "relative flex w-full items-center rounded-lg",
            "transition-all duration-200 ease-out",
            isParentActive
              ? [
                  "text-neutral-900 bg-neutral-100 dark:text-neutral-50 dark:bg-neutral-800",
                  "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                  "before:h-[18px] before:w-0.5 before:rounded-full before:rounded-lg",
                  "before:bg-indigo-500 dark:before:bg-indigo-400",
                ]
              : [
                  "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100",
                  "dark:text-neutral-400 dark:hover:text-neutral-50 dark:hover:bg-neutral-800",
                ],
            isCollapsed && "justify-center"
          )}>
            {/* Clicking the label/icon navigates to item.path */}
            <NavLink
              to={item.path}
              end={item.path === "/"}
              className={cn(
                "flex flex-1 items-center gap-3 px-3 py-2.5",
                "text-sm font-medium leading-none tracking-[-0.01em]",
                "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
                isCollapsed && "justify-center px-0"
              )}
            >
              <span className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors duration-200",
                isParentActive ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-neutral-500"
              )}>
                <Icon size={17} strokeWidth={isParentActive ? 2.2 : 1.8} />
              </span>

              {!isCollapsed && (
                <span className="flex-1 truncate text-left">{item.name}</span>
              )}

              {isCollapsed && isParentActive && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
              )}
            </NavLink>

            {/* Chevron toggle — separate from the NavLink */}
            {!isCollapsed && (
              <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={`${open ? "Collapse" : "Expand"} ${item.name}`}
                className={cn(
                  "flex h-full items-center pr-3 pl-1 py-2.5",
                  "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                )}
              >
                <ChevronDown
                  size={13}
                  className={cn(
                    "shrink-0 text-neutral-400 dark:text-neutral-600",
                    "transition-transform duration-200",
                    open && "rotate-180"
                  )}
                />
              </button>
            )}
          </div>

          {/* Sub-items */}
          {!isCollapsed && (
            <div className={cn(
              "overflow-hidden transition-all duration-200 ease-out",
              open ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
            )}>
              <div className="relative ml-[22px] mt-0.5 border-l border-neutral-200 dark:border-neutral-800 pb-0.5">
                <ul className="space-y-0.5 py-0.5" role="list">
                  {item.children.map((child) => (
                    <li key={child.path}>
                      <SidebarSubItem item={child} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </SidebarTooltip>
    );
  }

  // ── Leaf item (no children) ────────────────────────────────────────────────
  return (
    <SidebarTooltip label={item.name} description={item.description} enabled={isCollapsed}>
      <NavLink
        to={item.path}
        end={item.path === "/"}
        className={({ isActive }) =>
          cn(
            "relative flex items-center gap-3 rounded-lg px-3 py-2.5 w-full",
            "text-sm font-medium leading-none tracking-[-0.01em]",
            "transition-all duration-200 ease-out",
            "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
            !isActive && [
              "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100",
              "dark:text-neutral-400 dark:hover:text-neutral-50 dark:hover:bg-neutral-800",
              "hover:scale-[1.015]",
            ],
            isActive && [
              "text-neutral-900 bg-neutral-100 dark:text-neutral-50 dark:bg-neutral-800",
              "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
              "before:h-[18px] before:w-0.5 before:rounded-full",
              "before:bg-indigo-500 dark:before:bg-indigo-400",
            ],
            isCollapsed && "justify-center px-0"
          )
        }
      >
        {({ isActive }) => (
          <>
            <span className={cn(
              "flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors duration-200",
              isActive ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400 dark:text-neutral-500"
            )}>
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
            </span>
            {!isCollapsed && <span className="truncate">{item.name}</span>}
            {isCollapsed && isActive && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
            )}
          </>
        )}
      </NavLink>
    </SidebarTooltip>
  );
}