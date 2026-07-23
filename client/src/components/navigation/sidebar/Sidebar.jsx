import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Library,
  ClipboardCheck,
  Award,
  Users,
  Building2,
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
  ChevronRight,
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
      { name: "SOP Management", path: "/sops", icon: FileText },
      { name: "Course Management", path: "/courses", icon: BookOpen },
      { name: "Course Library", path: "/course-library", icon: Library },
      { name: "Assessments", path: "/assessments", icon: ClipboardCheck, sub: ["Leaderboard", "Report"] },
      { name: "Certificates", path: "/certificates", icon: Award },
      { name: "Users & Departments", path: "/users", icon: Users },
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

export default function Sidebar({ collapsed, mobileOpen, onMobileClose }) {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleGroup = (name) => {
    setExpandedGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  const isActive = (path) => {
    if (path === '/') return window.location.pathname === '/';
    return window.location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col",
        "transition-all duration-200 ease-out",
        collapsed ? "w-[64px]" : "w-[260px]",
        "max-lg:-translate-x-full",
        mobileOpen && "translate-x-0"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center",
          "border-b border-[var(--border-sidebar)]",
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="text-[13px] font-black tracking-[0.08em] text-neutral-900 dark:text-neutral-100 leading-none">
                SOP TRAINING
              </span>
              <span className="mt-[2px] text-[9px] font-medium tracking-[0.06em] uppercase text-neutral-500 leading-none">
                PLATFORM
              </span>
            </div>
          )}
        </Link>

        {!collapsed && (
          <button
            onClick={() => {}}
            aria-label="Collapse sidebar"
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-none"
        aria-label="Main navigation"
      >
        {MENU_ITEMS.map((item) => {
          if (item.group) {
            const isExpanded = expandedGroups[item.name] !== false;
            return (
              <div key={item.name} className="mb-4">
                {!collapsed && (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
                    {item.name}
                  </p>
                )}
                {collapsed && (
                  <div className="mx-2 mb-2 h-px bg-neutral-200 dark:bg-neutral-700" />
                )}
                <ul className="space-y-0.5" role="list">
                  {item.items.map((sub) => (
                    <li key={sub.path}>
                      {sub.sub ? (
                        <div>
                          <button
                            onClick={() => {
                              if (collapsed) {
                                navigate(sub.path);
                                handleNavClick();
                              } else {
                                toggleGroup(sub.name);
                              }
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                              isActive(sub.path)
                                ? "bg-blue-600 text-white"
                                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            )}
                          >
                            <sub.icon size={18} className="shrink-0" />
                            {!collapsed && (
                              <>
                                <span className="flex-1 text-left">{sub.name}</span>
                                <ChevronDown
                                  size={14}
                                  className={cn(
                                    "transition-transform duration-200",
                                    isExpanded ? "rotate-180" : ""
                                  )}
                                />
                              </>
                            )}
                          </button>
                          {isExpanded && !collapsed && sub.sub && (
                            <ul className="mt-0.5 space-y-0.5 px-3">
                              {sub.sub.map((subItem) => (
                                <li key={subItem}>
                                  <Link
                                    to={`${sub.path}/${subItem.toLowerCase().replace(/\s+/g, '-')}`}
                                    onClick={handleNavClick}
                                    className={cn(
                                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors",
                                      isActive(`${sub.path}/${subItem.toLowerCase().replace(/\s+/g, '-')}`)
                                        ? "bg-blue-600 text-white"
                                        : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    )}
                                  >
                                    {subItem}
                                  </Link>
                                </li>
                              ))}
                            </ul>
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

      {/* User footer */}
      <div
        ref={dropdownRef}
        className={cn(
          "flex shrink-0 items-center",
          "border-t border-[var(--border-sidebar)]",
          collapsed ? "justify-center gap-2 p-3" : "gap-3 px-4 py-3",
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
              <div className="absolute bottom-0 top-auto z-50 w-48 rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 shadow-lg py-1">
                <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-[10px] text-neutral-500 truncate">
                    {user?.role?.replace('_', ' ') || ''}
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
            <span className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
              {user?.full_name || user?.email || 'User'}
            </span>
            <span className="truncate text-[11px] text-neutral-500">
              {user?.role?.replace('_', ' ') || ''}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}