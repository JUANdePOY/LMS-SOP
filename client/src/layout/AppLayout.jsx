import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  PanelLeftClose,
  PanelRightClose,
  Search,
  BookOpen,
  Users,
  Sun,
  Moon,
  ChevronRight,
  X,
  Menu,
  MessageSquare,
  Megaphone,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/shared/components/navigation/sidebar/Sidebar";
import UserAvatar from "@/shared/components/ui/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { Scrollbar } from "@/shared/components/ui/Scrollbar";
import BannerSection from "@/shared/components/ui/BannerSection";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationDropdown from "@/shared/components/ui/NotificationDropdown";
import NotificationBadge from "@/shared/components/ui/NotificationBadge";
import { useNotificationStore, useNotificationPoller, useNotifications } from "@/shared/stores/notificationStore.js";
import { PageTransition } from "@/shared/motion";
import { useWebSocket } from "@/features/notifications/hooks/useWebSocket";
import { useActiveBanners } from "@/features/notifications/hooks/useActiveBanners";
import { useTabNotificationBadge } from "@/hooks/useTabNotificationBadge";
import { isQuietHours } from "@/shared/utils/quietHours";

const MOBILE_BOTTOM_NAV_ADMIN = [
  { name: "Home", path: "/", icon: BookOpen },
  { name: "Courses", path: "/courses", icon: BookOpen },
  { name: "SOP", path: "/sops", icon: FileText },
  { name: "Profile", path: "/profile", icon: User },
];

const MOBILE_BOTTOM_NAV_EMPLOYEE = [
  { name: "Home", path: "/", icon: BookOpen },
  { name: "Library", path: "/courses/library", icon: BookOpen },
  { name: "SOP", path: "/my-learning/sops", icon: FileText },
  { name: "Profile", path: "/profile", icon: User },
];

const HEADER_QUICK_ACCESS = [
  { name: "Messaging", path: "/messaging", icon: MessageSquare },
  { name: "Announcements", path: "/announcements", icon: Megaphone },
  { name: "Events", path: "/events", icon: Calendar, roles: ["super_admin"] },
];

const PATH_TITLE_MAP = {
  "/": "My Learning",
  "/messaging": "Messaging",
  "/announcements": "Announcements",
  "/events": "Events",
  "/courses/library": "Course Library",
  "/sops": "SOP Library",
  "/profile": "Profile",
  "/settings": "Settings",
  "/settings/roles": "Roles & Permissions",
  "/employee/settings": "Settings",
  "/audit-logs": "Audit Logs",
  "/courses": "Courses",
  "/courses/:id": "Course Details",
  "/courses/:id/builder": "Course Builder",
  "/courses/view/:id": "My Course",
  "/courses/view/:id/lesson/:lessonId": "Lesson",
  "/sops/:id": "SOP Workspace",
  "/sops/:id/versions/:versionId": "SOP Version",
  "/my-learning/sops/:id": "SOP",
  "/trash": "Trash",
  "/admin/organization": "Organization",
  "/admin/organization/hierarchy": "Hierarchy Overview",
  "/admin/organization/businesses": "Businesses",
  "/admin/organization/categories": "Categories",
  "/admin/organization/sop-management": "SOP Management",
  "/tasks": "Tasks & Projects",
  "/tasks/:id": "Task Details",
  "/tasks/my": "My Tasks",
};

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
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout, isDepartmentHead } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const isEmployee = user?.role === 'employee';
  const mobileNav = isEmployee ? MOBILE_BOTTOM_NAV_EMPLOYEE : MOBILE_BOTTOM_NAV_ADMIN;
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const themeToggleLabel = isDark ? "Switch to light theme" : "Switch to dark theme";
  useNotificationStore();
  useNotificationPoller();
  useWebSocket();
  const notificationData = useNotifications();
  const { fetchPreferences } = notificationData;
  const { banners: activeBanners } = useActiveBanners();
  const messageBadgeCount = notificationData.unreadMessageCount || 0;
  const eventBadgeCount = notificationData.getUnreadCountByEntityType('event') || 0;
  const announcementBadgeCount = notificationData.getUnreadCountByEntityType('announcement') || 0;
  const systemBadgeCount = notificationData.getSystemNotificationCount() || 0;
  useTabNotificationBadge(messageBadgeCount + systemBadgeCount);
  const quietHours = isQuietHours(notificationData.preferences);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (location.pathname.match(/^\/courses\/[^/]+\/builder$/)) {
      setCollapsed(true);
      setMobileOpen(false);
    }
  }, [location.pathname]);


  useEffect(() => {
    if (location.pathname.match(/^\/sops\/[^/]+$/)) {
      setCollapsed(true);
      setMobileOpen(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    const openSystemSidebar = () => {
      if (window.innerWidth >= 1024) {
        setCollapsed(false);
      } else {
        setMobileOpen(true);
      }
    };
    window.addEventListener("open-system-sidebar", openSystemSidebar);
    return () => window.removeEventListener("open-system-sidebar", openSystemSidebar);
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

      {!(isEmployee && location.pathname === '/my-learning/onboarding') && (
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      )}
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
              "border-b border-[var(--header-border)]",
              "bg-[var(--bg-topbar)] backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-topbar)]/85"
            )}
          >
            <div className="flex items-center gap-2 px-3 sm:px-4 h-full">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl text-white hover:text-white hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30 lg:hidden"
                )}
              >
                <Menu size={20} />
              </button>
              <button
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden lg:flex h-9 w-9 items-center justify-center rounded-xl text-white hover:text-white hover:bg-white/15 dark:hover:bg-white/10 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {collapsed ? (
                  <PanelRightClose size={20} />
                ) : (
                  <PanelLeftClose size={20} />
                )}
              </button>



              <nav
                aria-label={breadcrumbs.length > 0 ? "Breadcrumb" : "Page title"}
                className={cn(
                  "hidden sm:flex items-center gap-2 min-w-0",
                  "px-2 py-1",
                  "rounded-lg bg-white/10 border border-[var(--header-border)]",
                  "transition-colors"
                )}
              >
                <BookOpen size={14} className="text-white shrink-0" />
                {breadcrumbs.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-sm min-w-0">
                    <span className={cn(
                      "font-semibold truncate",
                      isEmployee ? "text-white" : "text-white"
                    )}>
                      {breadcrumbs[0].title}
                    </span>
                    {breadcrumbs.length > 1 && (
                      <>
                        <ChevronRight size={14} className="text-neutral-300 shrink-0" />
                        <span className="text-neutral-200 truncate">
                          {breadcrumbs[breadcrumbs.length - 1].title}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className={cn(
                    "text-sm font-semibold truncate",
                    isEmployee ? "text-white" : "text-white"
                  )}>
                    Learning
                  </span>
                )}
              </nav>
            </div>

            <div className="flex-1 max-w-xl mx-auto px-2">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1 px-3 sm:px-4 shrink-0">
              <NotificationDropdown showBadge={true} count={systemBadgeCount} />

              <div className="hidden md:flex items-center gap-0.5">
                {HEADER_QUICK_ACCESS
                  .filter((item) => !item.roles || item.roles.includes(user?.role))
                  .map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path || location.pathname.startsWith(item.path);
                  const badgeCount = item.path === "/messaging"
                    ? messageBadgeCount
                    : item.path === "/events"
                      ? eventBadgeCount
                      : item.path === "/announcements"
                        ? announcementBadgeCount
                        : 0;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      aria-label={item.name}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex h-9 w-9 items-center justify-center rounded-xl text-white",
                        "hover:text-white hover:bg-white/15 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30",
                        active && "text-white bg-white/20"
                      )}
                    >
                      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                      {badgeCount > 0 && <NotificationBadge count={badgeCount} muted={quietHours} />}
                    </button>
                  );
                })}
              </div>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-label="User menu"
                  className="flex items-center justify-center"
                >
                  <UserAvatar user={user} size="sm" ring />
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
                          onClick={() => { setProfileOpen(false); navigate(isDepartmentHead ? '/employee/settings' : '/settings'); }}
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
                        onClick={async () => { setProfileOpen(false); await logout(); navigate('/login'); }}
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
            <BannerSection items={activeBanners} />
            <PageTransition>
              <Outlet />
            </PageTransition>
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
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-9 py-2 text-sm text-[var(--text-primary)] placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-[rgba(242,92,5,0.20)] focus:border-[var(--color-primary)]"
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

      {!(isEmployee && location.pathname === '/my-learning/onboarding') && (
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
                    ? "text-[var(--color-primary)]"
                    : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-medium truncate w-full text-center">{item.name}</span>
              </a>
            );
          })}
        </nav>
      )}
    </div>
  );
}
