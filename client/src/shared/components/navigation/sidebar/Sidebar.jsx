import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Library,
  ClipboardCheck,
  Award,
  Users,
  MessageSquare,
  Megaphone,
  Calendar,
  CheckSquare,
  BarChart3,
  PieChart,
  Settings,
  Shield,
  LogOut,
  User,
  ChevronDown,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarItem from "./SidebarItem";
import { useAuth } from "@/contexts/AuthContext";

const MENU_ITEMS = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    name: "CORE MODULES",
    group: true,
    items: [
      {
        name: "Organization Management",
        path: "/admin/organization",
        icon: Building2,
        sub: ["Hierarchy", "Businesses", "Departments", "Categories", "SOP Management"],
      },
      { name: "Course Management", path: "/courses", icon: BookOpen },
      { name: "Course Library", path: "/course-library", icon: Library },
      { name: "Assessments", path: "/assessments", icon: ClipboardCheck, sub: ["Leaderboard", "Report"] },
      { name: "Certificates", path: "/certificates", icon: Award },
      { name: "Administration", path: "/users", icon: Users },
    ],
  },
  {
    name: "COMMUNICATION",
    group: true,
    items: [
      { name: "Messaging", path: "/messaging", icon: MessageSquare },
      { name: "Announcements", path: "/announcements", icon: Megaphone },
      { name: "Events", path: "/events", icon: Calendar },
    ],
  },
  {
    name: "INTERNAL OPERATIONS",
    group: true,
    items: [
      { name: "Tasks & Projects", path: "/tasks", icon: CheckSquare },
    ],
  },
  {
    name: "REPORTS & ANALYTICS",
    group: true,
    items: [
      { name: "Reports", path: "/reports", icon: BarChart3 },
      { name: "Analytics", path: "/analytics", icon: PieChart },
    ],
  },
  {
    name: "SYSTEM",
    group: true,
    items: [
      { name: "Settings", path: "/settings", icon: Settings },
      { name: "Audit Logs", path: "/audit-logs", icon: Shield },
    ],
  },
];

const SIDEBAR_WIDTH = {
  expanded: "w-[260px]",
  collapsed: "w-[72px]",
};

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }) {
  const [expandedSubMenus, setExpandedSubMenus] = useState({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const roleLabel = typeof user?.role === 'string' ? user.role.replace('_', ' ') : '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-expand Organization Management when on its child routes
  useEffect(() => {
    if (location.pathname.startsWith("/admin/organization") || location.pathname.startsWith("/sops")) {
      setExpandedSubMenus(prev => ({ ...prev, "Organization Management": true }));
    }
  }, [location.pathname]);

  const toggleSubMenu = (name) => {
    setExpandedSubMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isAnySubActive = (subItems, basePath) => {
    return subItems.some((subItem) => {
      if (subItem === "SOP Management") {
        return location.pathname.startsWith("/sops");
      }
      const subPath = `${basePath}/${subItem.toLowerCase().replace(/\s+/g, '-')}`;
      return location.pathname.startsWith(subPath);
    });
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col",
        "bg-[var(--bg-sidebar)] text-[var(--text-on-sidebar)]",
        "transition-all duration-200 ease-out",
        "bg-white/95 dark:bg-neutral-900/95",
        "backdrop-blur-md",
        "border-r border-[var(--border-sidebar)]",
        SIDEBAR_WIDTH.expanded,
        "max-lg:-translate-x-full",
        mobileOpen && "translate-x-0",
        collapsed && SIDEBAR_WIDTH.collapsed,
        "shadow-lg lg:shadow-none"
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center",
          "bg-[var(--bg-topbar)] shadow-[0_1px_0_rgba(0,0,0,0.15)]",
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-[13px] font-black tracking-[0.08em] text-white leading-none">
                SOP TRAINING
              </span>
              <span className="mt-[2px] text-[9px] font-medium tracking-[0.06em] uppercase text-white/70 leading-none">
                PLATFORM
              </span>
            </div>
          )}
        </Link>
      </div>

      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-2.5 py-3 scrollbar-none"
        aria-label="Main navigation"
      >
        {MENU_ITEMS.map((item) => {
          if (item.group) {
            return (
              <div key={item.name} className="mb-3 sm:mb-4">
                {!collapsed && (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--text-on-sidebar)_55%,transparent)]">
                    {item.name}
                  </p>
                )}
                {collapsed && <div className="mx-2 mb-2 h-px bg-[var(--border-sidebar)]" />}
                <ul className="space-y-0.5" role="list">
                  {item.items.map((sub) => (
                    <li key={sub.path}>
                      {sub.sub ? (
                        <div className="w-full">
                          <button
                            onClick={() => {
                              if (collapsed) {
                                navigate(sub.path);
                                handleNavClick();
                              } else {
                                toggleSubMenu(sub.name);
                              }
                            }}
                            className={cn(
                              "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
                              "text-sm font-medium leading-none tracking-[-0.01em]",
                              "transition-all duration-200 ease-out",
                              "outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-amber)_60%,transparent)]",
                              (isActive(sub.path) || isAnySubActive(sub.sub, sub.path))
                                ? [
                                    "text-[var(--text-on-sidebar)] bg-[var(--bg-active)]",
                                    "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                                    "before:h-[18px] before:w-0.5 before:rounded-full",
                                    "before:bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]",
                                  ]
                                : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]",
                              collapsed && "justify-center px-0"
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-[18px] w-[18px] shrink-0 items-center justify-center transition-colors duration-200",
                                (isActive(sub.path) || isAnySubActive(sub.sub, sub.path)) ? "text-[var(--text-on-sidebar)]" : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)]"
                              )}
                            >
                              <sub.icon size={17} strokeWidth={(isActive(sub.path) || isAnySubActive(sub.sub, sub.path)) ? 2.2 : 1.8} />
                            </span>
                            {!collapsed && (
                              <>
                                <span className="flex-1 text-left truncate">{sub.name}</span>
                                <ChevronDown
                                  size={13}
                                  className={cn(
                                    "transition-transform duration-200 shrink-0",
                                    expandedSubMenus[sub.name] ? "rotate-180" : ""
                                  )}
                                />
                              </>
                            )}
                          </button>
                          {expandedSubMenus[sub.name] && !collapsed && sub.sub && (
                            <div className="overflow-hidden transition-all duration-200 ease-out">
                              <div className="relative ml-[22px] mt-0.5 border-l border-[var(--border-sidebar)] pb-0.5">
                                <ul className="space-y-0.5 py-0.5" role="list">
                                  {sub.sub.map((subItem) => {
                                    const isSopMgmt = subItem === "SOP Management";
                                    const subPath = isSopMgmt ? "/sops" : `${sub.path}/${subItem.toLowerCase().replace(/\s+/g, '-')}`;
                                    const active = isActive(subPath);
                                    return (
                                      <li key={subItem}>
                                        <Link
                                          to={subPath}
                                          onClick={handleNavClick}
                                          className={cn(
                                            "relative flex items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 w-full",
                                            "text-[13px] font-medium leading-none tracking-[-0.01em]",
                                            "transition-all duration-150 ease-out",
                                            active
                                              ? [
                                                  "text-[var(--text-on-sidebar)] bg-[var(--bg-active)]",
                                                  "before:absolute before:left-[18px] before:top-1/2 before:-translate-y-1/2",
                                                  "before:h-[14px] before:w-0.5 before:rounded-full",
                                                  "before:bg-[color-mix(in_srgb,var(--accent-amber)_70%,transparent)]",
                                                ]
                                              : "text-[color-mix(in_srgb,var(--text-on-sidebar)_70%,transparent)] hover:text-[var(--text-on-sidebar)] hover:bg-[var(--bg-hover)]"
                                          )}
                                        >
                                          {subItem}
                                        </Link>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <SidebarItem
                          item={sub}
                          isCollapsed={collapsed}
                          onNavClick={handleNavClick}
                          isActive={isActive(sub.path)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          }

          return (
            <li key={item.path}>
              <SidebarItem
                item={item}
                isCollapsed={collapsed}
                onNavClick={handleNavClick}
                isActive={isActive(item.path)}
              />
            </li>
          );
        })}
      </nav>

      <div
        ref={dropdownRef}
        className={cn(
          "flex shrink-0 items-center",
          "border-t border-[var(--border-sidebar)]",
          collapsed ? "justify-center gap-2 p-3" : "gap-3 px-3 sm:px-4 py-3",
          "cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
        )}
        onClick={() => setProfileMenuOpen((v) => !v)}
      >
        <div className="relative">
          <span
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              "bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white shadow-sm"
            )}
          >
            {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-[var(--bg-surface)] bg-emerald-400" />
          </span>

          {profileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
              <div className="absolute left-full bottom-0 top-auto z-50 ml-2 w-48 rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 shadow-lg py-1">
                <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate">
                    {roleLabel}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(false); navigate('/profile'); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <User size={14} /> Profile
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(false); navigate('/settings'); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Settings size={14} /> Settings
                </button>
                <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(false); logout(); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="flex flex-1 flex-col leading-tight overflow-hidden">
            <span className="truncate text-[13px] font-medium text-[var(--text-on-sidebar)]">
              {user?.full_name || user?.email || 'User'}
            </span>
            <span className="truncate text-[11px] text-[var(--text-on-sidebar)]">
              {roleLabel}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}