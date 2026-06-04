import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Settings, LogOut, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarItem from "./SidebarItem";
import { menuItems, filterMenuByRole } from "@/config/menuItems";
import { useAuth } from "@/contexts/AuthContext";
import { getAlerts } from "@/services/api";

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }) {
  const [alertSummary, setAlertSummary] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const visibleMenuItems = filterMenuByRole(menuItems, user?.role);
  const isSuperAdmin = user?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAlerts({ params: { limit: 1 } });
        if (res.data?.status === 'success') {
          setAlertSummary(res.data.data?.summary || null);
        }
      } catch {
        // silent fail — badge is non-critical
      }
    };
    load();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col",
"transition-all duration-200 ease-out",
         collapsed ? "w-[64px]" : "w-[260px]",
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
           collapsed ? "justify-center px-0" : "justify-between px-4"
         )}
       >
         <Link
           to="/"
           onClick={handleNavClick}
           className={cn(
             "flex items-center gap-2.5 overflow-hidden",
             collapsed && "justify-center"
           )}
         >
           <img
             src="/8th_ARCEN.png"
             alt="Air Force Logo"
             className={cn(
               "h-9 w-9 shrink-0",
               collapsed && "mx-auto"
             )}
           />
{!collapsed && (
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
        </div>

        {/* ── Navigation ────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-none"
        aria-label="Main navigation"
      >
{!collapsed && (
           <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-600">
             Navigation
           </p>
         )}

        <ul className="space-y-0.5" role="list">
          {visibleMenuItems.map((item) => (
            <li key={item.path}>
              <SidebarItem item={item} isCollapsed={collapsed} onNavClick={handleNavClick} />
            </li>
          ))}
        </ul>

        <div className="my-3 border-t border-neutral-200 dark:border-neutral-800" />

{!collapsed && (
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
                collapsed && "justify-center px-0"
              )}
            >
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-neutral-400 dark:text-neutral-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                <Bell size={17} strokeWidth={1.8} />
              </span>
              {!collapsed && <span className="truncate">Alerts</span>}
              {!collapsed && alertSummary && (alertSummary.unread > 0 || alertSummary.critical > 0) && (
                <span className={cn(
                  "ml-auto inline-flex min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
                  alertSummary.critical > 0
                    ? "bg-red-600 text-white"
                    : "bg-amber-500 text-white"
                )}>
                  {alertSummary.critical || alertSummary.unread}
                </span>
              )}
              {collapsed && alertSummary && (alertSummary.unread > 0 || alertSummary.critical > 0) && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </Link>
          </li>
          {isSuperAdmin && (
        <li>
          <SidebarItem
            item={{ name: "Audit Logs", path: "/audit-logs", icon: History, description: "System change history" }}
            isCollapsed={collapsed}
            onNavClick={handleNavClick}
          />
        </li>
      )}
      {isSuperAdmin && (
        <li>
          <SidebarItem
            item={{ name: "Settings", path: "/settings", icon: Settings, description: "User & system management" }}
            isCollapsed={collapsed}
            onNavClick={handleNavClick}
          />
        </li>
      )}
        </ul>
      </nav>

{/* ── User footer ───────────────────────────────────────── */}
      <div
        ref={dropdownRef}
        className={cn(
          "flex shrink-0 items-center",
          "border-t border-neutral-200 dark:border-neutral-800",
          "bg-neutral-50 dark:bg-neutral-900",
          collapsed ? "justify-center gap-2 p-3" : "gap-3 px-4 py-3",
          "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        )}
        onClick={() => setShowProfileDropdown(prev => !prev)}
      >
        <div className="relative">
          <span
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              "bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm"
            )}
          >
            {user?.email ? user.email.substring(0, 2).toUpperCase() : 'CO'}
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white dark:border-neutral-900 bg-emerald-400" />
          </span>

{showProfileDropdown && (
             <div
               className={cn(
                 "absolute bottom-0 top-auto",
                 collapsed ? "left-14 ml-2" : "left-full ml-2",
                 "min-w-[200px] rounded-lg",
                 "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700",
                 "shadow-lg z-50 py-2 overflow-hidden"
               )}
             >
               <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
                 <p className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200 truncate">
                   {user?.email || 'User'}
                 </p>
                 <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">
                   {user?.role ? user.role.replace('admin_', 'Admin ').replace('_', ' ') : '—'}
                 </p>
               </div>
               <button
                 onClick={(e) => { e.stopPropagation(); setShowProfileDropdown(false); navigate('/profile'); }}
                 className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
               >
                 <User size={16} />
                 My Profile
               </button>
               <div className="border-t border-neutral-200 dark:border-neutral-800 my-1" />
               <button
                 onClick={(e) => { e.stopPropagation(); setShowProfileDropdown(false); logout(); }}
                 className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
               >
                 <LogOut size={16} />
                 Logout
               </button>
             </div>
           )}
        </div>

{!collapsed && (
           <div className="flex flex-1 flex-col leading-tight overflow-hidden">
            <span className="truncate text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
              {user?.email || 'User'}
            </span>
            <span className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">
              {user?.role ? user.role.replace('admin_', 'Admin ').replace('_', ' ') : '—'}
            </span>
          </div>
        )}
      </div>
    </aside>
   );
 }
