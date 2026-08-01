import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  PanelLeftClose,
  PanelRightClose,
  Search,
  Bell,
  BookOpen,
  FileText,
  Users,
  Sun,
  Moon,
  ChevronRight,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/shared/components/navigation/sidebar/Sidebar";
import { useTheme } from "@/hooks/useTheme";
import { Scrollbar } from "@/shared/components/ui/Scrollbar";

const MOBILE_BOTTOM_NAV_ADMIN = [
  { name: "Home", path: "/", icon: BookOpen },
  { name: "Courses", path: "/courses", icon: BookOpen },
  { name: "SOPs", path: "/sops", icon: FileText },
  { name: "Users", path: "/settings/users", icon: Users },
];

const MOBILE_BOTTOM_NAV_EMPLOYEE = [
  { name: "Home", path: "/", icon: BookOpen },
  { name: "Library", path: "/courses/library", icon: BookOpen },
  { name: "SOPs", path: "/sops", icon: FileText },
  { name: "Profile", path: "/profile", icon: Users },
];

const PATH_TITLE_MAP = {
  "/": "My Learning",
  "/courses/library": "Course Library",
  "/sops": "SOP Library",
  "/profile": "Profile",
  "/settings": "Settings",
  "/settings/users": "User Management",
  "/settings/roles": "Roles & Permissions",
  "/audit-logs": "Audit Logs",
  "/courses": "Courses",
  "/courses/:id": "Course Details",
  "/courses/:id/builder": "Course Builder",
  "/courses/view/:id": "My Course",
  "/courses/view/:id/lesson/:lessonId": "Lesson",
  "/sops/:id": "SOP Workspace",
  "/sops/:id/versions/:versionId": "SOP Version",
  "/trash": "Trash",
  "/admin/organization": "Organization",
  "/admin/organization/hierarchy": "Hierarchy Overview",
  "/admin/organization/businesses": "Businesses",
  "/admin/organization/departments": "Departments",
  "/admin/organization/categories": "Categories",
  "/admin/organization/sop-management": "SOP Management",
};

function matchPath(pathname, pattern) {
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");
  if (patternParts.length !== pathParts.length) return false;
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) continue;
    if (patternParts[i] !== pathParts[i]) return false;
  }
  return true;
}

function getBreadcrumbs(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = [];
  let currentPath = "";
  for (const part of parts) {
    currentPath += `/${part}`;
    if (PATH_TITLE_MAP[currentPath]) {
      crumbs.push({ title: PATH_TITLE_MAP[currentPath], path: currentPath });
    }
  }
  return crumbs;
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const isEmployee = user?.role === 'employee';
  const mobileNav = isEmployee ? MOBILE_BOTTOM_NAV_EMPLOYEE : MOBILE_BOTTOM_NAV_ADMIN;
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const themeToggleLabel = isDark ? "Switch to light theme" : "Switch to dark theme";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-screen",
        "bg-[var(--bg-page)] text-[var(--text-primary)]",
        "transition-colors duration-300",
        "pb-16 lg:pb-0"
      )}
    >
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main
        id="main-content"
        className={cn(
          "flex-1 min-w-0 flex flex-col",
          "transition-all duration-200 ease-out",
          collapsed ? "lg:ml-[72px]" : "lg:ml-[260px]",
          "ml-0"
        )}
      >
        <Scrollbar variant="viewport">
          <header
            className={cn(
              "sticky top-0 z-30 flex items-center gap-2 sm:gap-3 lg:px-6 h-14",
              "border-b border-[var(--border)]",
              "bg-[var(--bg-topbar)]"
            )}
          >
            <div className="flex items-center gap-2 px-3 sm:px-4 h-full">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors lg:hidden"
              >
                <Menu size={20} />
              </button>
              <button
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden lg:flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {collapsed ? (
                  <PanelRightClose size={20} />
                ) : (
                  <PanelLeftClose size={20} />
                )}
              </button>

              <div className="hidden sm:flex items-center gap-2 min-w-0">
                {breadcrumbs.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-sm min-w-0">
                    <span className={cn(
                      "font-semibold truncate",
                      isEmployee ? "text-blue-600 dark:text-blue-400" : "text-neutral-900 dark:text-neutral-100"
                    )}>
                      {breadcrumbs[0].title}
                    </span>
                    {breadcrumbs.length > 1 && (
                      <>
                        <ChevronRight size={14} className="text-neutral-400 shrink-0" />
                        <span className="text-neutral-600 dark:text-neutral-300 truncate">
                          {breadcrumbs[breadcrumbs.length - 1].title}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className={cn(
                    "text-sm font-semibold truncate",
                    isEmployee ? "text-blue-600 dark:text-blue-400" : "text-neutral-900 dark:text-neutral-100"
                  )}>
                    Learning
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 max-w-md mx-auto hidden md:block px-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder={isEmployee ? "Search courses, SOPs, materials…" : "Search…"}
                  className={cn(
                    "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-9 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
                    searchFocused && "ring-2 ring-blue-500/20 border-blue-500"
                  )}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
              </div>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 px-3 sm:px-4">
              <button
                onClick={() => setShowSearchMobile((v) => !v)}
                aria-label="Search"
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Search size={18} />
              </button>

              <button
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Bell size={18} />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  3
                </span>
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-label="User menu"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isEmployee
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200"
                      : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                  )}
                >
                  {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 shadow-lg py-1">
                      <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                        <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {user?.full_name || 'User'}
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate capitalize">
                          {user?.role?.replace('_', ' ') || 'User'}
                        </p>
                      </div>
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        <Users size={14} /> Profile
                      </button>
                      {!isEmployee && (
                        <button
                          onClick={() => { setProfileOpen(false); navigate('/settings'); }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          Settings
                        </button>
                      )}
                      <button
                        onClick={() => toggleTheme()}
                        className="flex w-full items-center gap-3 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      >
                        {isDark ? <Sun size={14} /> : <Moon size={14} />}
                        {themeToggleLabel}
                      </button>
                      <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/login'); }}
                        className="flex w-full items-center gap-3 px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 w-full px-4 sm:px-6 py-4 sm:py-6">
            <Outlet />
          </div>

          <footer className="border-t border-[var(--border)] py-2.5 text-center">
            <p className="text-[11px] sm:text-xs text-neutral-400">
              © {new Date().getFullYear()} SOP Training Platform. All rights reserved.
            </p>
          </footer>
        </Scrollbar>
      </main>

      {showSearchMobile && (
        <div className="fixed inset-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-4 md:hidden">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search courses, SOPs, materials…"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-9 py-2 text-sm text-[var(--text-primary)] placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowSearchMobile(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
          "bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md",
          "border-t border-[var(--border)]",
          "flex items-center justify-around px-2 py-1.5",
          "safe-area-inset-bottom"
        )}
        aria-label="Mobile navigation"
      >
        {mobileNav.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <a
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg min-w-[56px]",
                "transition-colors duration-150",
                active
                  ? "text-blue-600"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium truncate w-full text-center">{item.name}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
