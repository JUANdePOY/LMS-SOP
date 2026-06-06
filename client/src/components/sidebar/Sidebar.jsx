import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Bell, Settings, History } from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarItem from "./SidebarItem";
import { menuItems, filterMenuByRole } from "@/config/menuItems";
import { useAuth } from "@/contexts/AuthContext";

export default function Sidebar({ collapsed: controlledCollapsed, onToggle }) {
  const { user, isSuperAdmin } = useAuth();
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setInternalCollapsed((v) => !v);
  };

  // Filter menu items based on user role
  const filteredMenuItems = user ? filterMenuByRole(menuItems, user.role) : [];

  return (
<aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col",
        "transition-all duration-200 ease-out",
        isCollapsed ? "w-[64px]" : "w-[260px]",
        "bg-[var(--bg-sidebar)] border-r border-[var(--border-sidebar)]"
      )}
    >
     {/* ── Brand ─────────────────────────────────────────────── */}
     <div
          className={cn(
            "flex h-16 shrink-0 items-center",
            "border-b border-[var(--border-sidebar)]",
            isCollapsed ? "justify-center px-0" : "justify-between px-4"
          )}
        >
          <Link
            to="/"
            className={cn(
              "flex items-center gap-2.5 overflow-hidden",
              isCollapsed && "justify-center"
            )}
          >
            <img
              src="/8th_ARCEN.png"
              alt="Air Force Logo"
              className={cn(
                "h-9 w-9 shrink-0",
                isCollapsed && "mx-auto"
              )}
            />
            {!isCollapsed && (
              <div className="flex flex-col leading-tight overflow-hidden">
                {/* P.A.F.R with letter-spaced styling */}
                <span className="text-[15px] font-black tracking-[0.12em] text-[var(--text-on-sidebar)] leading-none">
                  P.A.F.R
                </span>
                {/* Subtitle — subtle, small, tight */}
                <span className="mt-[3px] text-[9px] font-medium tracking-[0.06em] uppercase text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] truncate leading-none">
                  Philippine Air Force Reservists
                </span>
              </div>
            )}
          </Link>

          {/* Collapse toggle */}
          {!isCollapsed && (
            <button
              onClick={handleToggle}
              aria-label="Collapse sidebar"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md",
                "text-[var(--text-on-sidebar)] hover:text-[color-mix(in_srgb,var(--text-on-sidebar)_120%,transparent)]",
                "hover:bg-[var(--bg-hover)]",
                "transition-colors duration-150"
              )}
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

       {/* ── Expand button (collapsed only) ────────────────────── */}
       {isCollapsed && (
         <div className="flex justify-center mt-2">
           <button
             onClick={handleToggle}
             aria-label="Expand sidebar"
             className={cn(
               "flex h-7 w-7 items-center justify-center rounded-md",
               "text-[var(--text-on-sidebar)] hover:text-[color-mix(in_srgb,var(--text-on-sidebar)_120%,transparent)]",
               "hover:bg-[var(--bg-hover)]",
               "transition-colors duration-150"
             )}
           >
             <ChevronLeft size={15} className="rotate-180" />
           </button>
         </div>
       )}

       {/* ── Navigation ────────────────────────────────────────── */}
       <nav
         className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-none"
         aria-label="Main navigation"
       >
         {!isCollapsed && (
           <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-on-sidebar)]">
             Navigation
           </p>
         )}

        <ul className="space-y-0.5" role="list">
          {filteredMenuItems.map((item) => (
            <li key={item.path}>
              <SidebarItem item={item} isCollapsed={isCollapsed} />
            </li>
          ))}
        </ul>

{/* ── System section (Super Admin only) ────────────────── */}
        {isSuperAdmin && (
          <>
            <div className="my-3 border-t border-[var(--border-sidebar)]" />

            {!isCollapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-on-sidebar)]">
                System
              </p>
            )}

            <ul className="space-y-0.5" role="list">
              <li>
                <SidebarItem
                  item={{ name: "Alerts", path: "/alerts", icon: Bell, description: "Notifications" }}
                  isCollapsed={isCollapsed}
                />
              </li>
              <li>
                <SidebarItem
                  item={{ name: "Settings", path: "/settings", icon: Settings, description: "Preferences" }}
                  isCollapsed={isCollapsed}
                />
              </li>
              <li>
                <SidebarItem
                  item={{ name: "Audit Logs", path: "/audit-logs", icon: History, description: "System change history" }}
                  isCollapsed={isCollapsed}
                />
              </li>
            </ul>
          </>
        )}
      </nav>

      {/* ── User footer ───────────────────────────────────────── */}
      <div
        className={cn(
          "flex shrink-0 items-center",
          "border-t border-[var(--border-sidebar)]",
          "bg-[var(--bg-subtle)]",
          isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
        )}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">
          CO
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-[var(--bg-surface)] bg-emerald-400" />
        </span>

        {!isCollapsed && (
          <div className="flex flex-col leading-tight overflow-hidden">
            <span className="truncate text-[13px] font-medium text-[var(--text-on-sidebar)]">
              Commanding Officer
            </span>
            <span className="truncate text-[11px] text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)]">
              CO Admin
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}