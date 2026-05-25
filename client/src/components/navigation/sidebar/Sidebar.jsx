import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Bell, Settings, LogOut, History } from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarItem from "./SidebarItem";
import { menuItems, filterMenuByRole, ADMIN_ROLES } from "@/config/menuItems";
import { useAuth } from "@/contexts/AuthContext";
import { getAlerts } from "@/services/api";

export default function Sidebar({ collapsed: controlledCollapsed, onToggle, mobileOpen, onMobileClose }) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [alertSummary, setAlertSummary] = useState(null);

  const { user, logout } = useAuth();
  const visibleMenuItems = filterMenuByRole(menuItems, user?.role);
  const isSuperAdmin = user?.role === 'admin';
  const isAnyAdmin = ADMIN_ROLES.includes(user?.role);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAlerts({ params: { limit: 1 } });
        if (res.data?.status === 'success') {
          setAlertSummary(res.data.data?.summary || null);
        }
      } catch (_) {
        // silent fail — badge is non-critical
      }
    };
    load();
  }, []);

  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggle) onToggle();
    else setInternalCollapsed((v) => !v);
  };

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col",
        "transition-all duration-200 ease-out",
        isCollapsed ? "w-[64px]" : "w-[260px]",
        "bg-white border-r border-neutral-200",
        "dark:bg-neutral-950 dark:border-neutral-800",
        // Mobile: hidden by default, shown when mobileOpen
        "max-lg:-translate-x-full",
        "max-lg:data-[mobile-open=true]:translate-x-0",
        mobileOpen && "translate-x-0"
      )}
      data-mobile-open={mobileOpen}
    >
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center",
          "border-b border-neutral-200 dark:border-neutral-800",
          isCollapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        <Link
          to="/"
          onClick={handleNavClick}
          className={cn(
            "flex items-center gap-2.5 overflow-hidden",
            isCollapsed && "justify-center"
          )}
        >
          <span className={cn(
            "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            "bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700",
            "shadow-md shadow-blue-900/30 dark:shadow-blue-900/50",
            "ring-2 ring-blue-500/30 dark:ring-blue-400/20",
            "before:absolute before:inset-[3px] before:rounded-full",
            "before:border before:border-white/20"
          )}>
            <span className="absolute inset-0 rounded-full border border-white/10" />
            <span className="relative z-10 text-[9px] font-black tracking-[0.05em] text-white leading-none select-none">
              PAF
            </span>
            <span className="absolute bottom-[5px] text-[6px] text-yellow-300 leading-none select-none">★</span>
          </span>

          {!isCollapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-[15px] font-black tracking-[0.12em] text-neutral-900 dark:text-neutral-50 leading-none">
                P.A.F.R
              </span>
              <span className="mt-[3px] text-[9px] font-medium tracking-[0.06em] uppercase text-neutral-400 dark:text-neutral-500 truncate leading-none">
                Philippine Air Force Reservists
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle — desktop only */}
        {!isCollapsed && (
          <button
            onClick={handleToggle}
            aria-label="Collapse sidebar"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              "text-neutral-400 hover:text-neutral-700",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "dark:text-neutral-500 dark:hover:text-neutral-300",
              "transition-colors duration-150",
              "max-lg:hidden"
            )}
          >
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* ── Expand button (collapsed only) — desktop only */}
      {isCollapsed && (
        <div className="flex justify-center mt-2 max-lg:hidden">
          <button
            onClick={handleToggle}
            aria-label="Expand sidebar"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              "text-neutral-400 hover:text-neutral-700",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "dark:text-neutral-500 dark:hover:text-neutral-300",
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
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-600">
            Navigation
          </p>
        )}

        <ul className="space-y-0.5" role="list">
          {visibleMenuItems.map((item) => (
            <li key={item.path}>
              <SidebarItem item={item} isCollapsed={isCollapsed} onNavClick={handleNavClick} />
            </li>
          ))}
        </ul>

        <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />

        {!isCollapsed && (
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-600">
            System
          </p>
        )}

        <ul className="space-y-0.5" role="list">
          <li>
            <Link
              to="/alerts"
              onClick={handleNavClick}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
                "text-sm font-medium leading-none tracking-[-0.01em]",
                "transition-all duration-200 ease-out",
                "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100",
                "dark:text-neutral-400 dark:hover:text-neutral-50 dark:hover:bg-neutral-800",
                "hover:scale-[1.015]",
                isCollapsed && "justify-center px-0"
              )}
            >
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-neutral-400 dark:text-neutral-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                <Bell size={17} strokeWidth={1.8} />
              </span>
              {!isCollapsed && <span className="truncate">Alerts</span>}
              {!isCollapsed && alertSummary && (alertSummary.unread > 0 || alertSummary.critical > 0) && (
                <span className={cn(
                  "ml-auto inline-flex min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
                  alertSummary.critical > 0
                    ? "bg-red-600 text-white"
                    : "bg-amber-500 text-white"
                )}>
                  {alertSummary.critical || alertSummary.unread}
                </span>
              )}
              {isCollapsed && alertSummary && (alertSummary.unread > 0 || alertSummary.critical > 0) && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </Link>
          </li>
          {isSuperAdmin && (
            <li>
              <SidebarItem
                item={{ name: "Settings", path: "/settings", icon: Settings, description: "Preferences" }}
                isCollapsed={isCollapsed}
                onNavClick={handleNavClick}
              />
            </li>
          )}
          {isSuperAdmin && (
            <li>
              <SidebarItem
                item={{ name: "Audit Logs", path: "/audit-logs", icon: History, description: "System change history" }}
                isCollapsed={isCollapsed}
                onNavClick={handleNavClick}
              />
            </li>
          )}
        </ul>
      </nav>

      {/* ── User footer ───────────────────────────────────────── */}
      <div
        className={cn(
          "flex shrink-0 items-center",
          "border-t border-neutral-200 dark:border-neutral-800",
          "bg-neutral-50 dark:bg-neutral-900",
          isCollapsed ? "justify-center gap-2 p-3" : "gap-3 px-4 py-3"
        )}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">
          CO
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white dark:border-neutral-900 bg-emerald-400" />
        </span>

        {!isCollapsed && (
          <div className="flex flex-1 flex-col leading-tight overflow-hidden">
            <span className="truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
              {user?.email || 'User'}
            </span>
            <span className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">
              {user?.role ? user.role.replace('admin_', 'Admin ').replace('_', ' ') : '—'}
            </span>
          </div>
        )}

        <button
          onClick={logout}
          className={cn(
            "flex items-center justify-center rounded-md text-red-600 hover:text-red-700",
            "hover:bg-red-50 dark:hover:bg-red-950/20",
            "transition-colors duration-150",
            isCollapsed ? "p-2" : "p-2 ml-1"
          )}
          title="Logout"
        >
          <LogOut size={isCollapsed ? 16 : 18} />
          {!isCollapsed && <span className="ml-1 text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
