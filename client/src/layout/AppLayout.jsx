import { useState, useEffect, useRef, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  BookOpen,
  Users,
  Sun,
  Moon,
  X,
  Menu,
  MessageSquare,
  Megaphone,
  Calendar,
  User,
  FileText,
  Settings,
  FolderKanban,
  Building2,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/shared/components/navigation/sidebar/Sidebar";
import UserAvatar from "@/shared/components/ui/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAutoHideScrollbar } from "@/hooks/useAutoHideScrollbar";
import { Scrollbar } from "@/shared/components/ui/Scrollbar";
import BannerSection from "@/shared/components/ui/BannerSection";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationDropdown from "@/shared/components/ui/NotificationDropdown";
import NotificationBadge from "@/shared/components/ui/NotificationBadge";
import TaskCommandPalette from "@/features/task-management/components/TaskCommandPalette";
import { getProjects } from "@/features/task-management/services/projectService";
import { getClients } from "@/features/task-management/api/client.api";
import { useNotificationStore, useNotificationPoller, useNotifications } from "@/shared/stores/notificationStore.js";
import { PageTransition } from "@/shared/motion";
import { useWebSocket } from "@/features/notifications/hooks/useWebSocket";
import { useActiveBanners } from "@/features/notifications/hooks/useActiveBanners";
import { useContextualBanners } from "@/features/notifications/hooks/useContextualBanners";
import { useAutoPushSubscribe } from "@/features/notifications/hooks/useAutoPushSubscribe";
import { useTabNotificationBadge } from "@/hooks/useTabNotificationBadge";
import { isQuietHours } from "@/shared/utils/quietHours";
import { NavigationProvider, useNavigation } from "@/shared/contexts/NavigationContext";
import SecondarySidebar from "@/shared/components/navigation/SecondarySidebar";

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

function SecondaryNavRouteSync() {
  const { openSecondaryNav, closeSecondaryNav } = useNavigation();
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith("/clients")) {
      openSecondaryNav("clients");
    } else if (location.pathname !== "/tasks" && location.pathname !== "/tasks/my") {
      // Navigated via any other sidebar item — collapse the panel.
      closeSecondaryNav();
    }
  }, [location.pathname, openSecondaryNav, closeSecondaryNav]);
  return null;
}

/**
 * Mobile trigger for the Businesses sidebar. Rendered inside the
 * NavigationProvider (AppLayout itself sits above it), so it can read the
 * current panel state and toggle it. Hidden on desktop, where the panel
 * opens itself from the nav rail.
 */
function SecondaryNavMobileTrigger() {
  const { secondaryNav, openSecondaryNav, closeSecondaryNav } = useNavigation();
  const location = useLocation();
  const isTasksRoute = location.pathname === "/tasks" || location.pathname.startsWith("/tasks/my");
  const secondaryOpen = secondaryNav === "clients";
  if (!isTasksRoute) return null;
  return (
    <button
      onClick={() => (secondaryOpen ? closeSecondaryNav() : openSecondaryNav("clients"))}
      aria-label={secondaryOpen ? "Close businesses panel" : "Open businesses panel"}
      aria-expanded={secondaryOpen}
      className="flex lg:hidden h-9 items-center gap-1.5 rounded-xl px-2.5 text-[var(--header-fg)] hover:bg-[var(--header-hover-bg)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-amber)_60%,transparent)]"
    >
      <Building2 size={18} />
      <span className="text-xs font-medium">Businesses</span>
    </button>
  );
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSearchMobile, setShowSearchMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { user, logout, isDepartmentHead, isAnyAdmin } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const mainScrollRef = useAutoHideScrollbar();
  const isEmployee = user?.role === 'employee';
  const greetingName = (user?.full_name || '').trim().split(/\s+/)[0] || 'there';
  const greetingWord = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  const mobileNav = isEmployee ? MOBILE_BOTTOM_NAV_EMPLOYEE : MOBILE_BOTTOM_NAV_ADMIN;
  const themeToggleLabel = isDark ? "Switch to light theme" : "Switch to dark theme";
  useNotificationStore();
  useNotificationPoller();
  useWebSocket();
  const isDashboard = location.pathname === '/';
  const notificationData = useNotifications();
  const { fetchPreferences } = notificationData;
  // Auto-subscribe every logged-in user to web push on first load (opt-out
  // instead of opt-in) so due-date reminders actually reach them outside the
  // app. Respects the user's own push-channel preference and a denied browser
  // permission — never throws.
  useAutoPushSubscribe();
  const { banners: activeBanners } = useActiveBanners({ enabled: isDashboard });
  const { banners: contextualBanners } = useContextualBanners({ enabled: isDashboard });
  const messageBadgeCount = notificationData.unreadMessageCount || 0;
  const eventBadgeCount = notificationData.getUnreadCountByEntityType('event') || 0;
  const announcementBadgeCount = notificationData.getUnreadCountByEntityType('announcement') || 0;
  const systemBadgeCount = notificationData.getSystemNotificationCount() || 0;
  useTabNotificationBadge(messageBadgeCount + systemBadgeCount);
  const quietHours = isQuietHours(notificationData.preferences);

  // Global command palette (Cmd/Ctrl+K) — available on every page, not just the
  // Tasks pages. Navigation + quick-create are static; project/client "open"
  // commands are fetched once and merged in.
  const [entityCommands, setEntityCommands] = useState([]);

  useEffect(() => {
    const normalize = (data) => (Array.isArray(data) ? data : (data?.rows || data?.data || []));
    let active = true;
    const calls = [
      isAnyAdmin ? getProjects().then((d) => normalize(d)).catch(() => []) : Promise.resolve([]),
      getClients().then((d) => normalize(d?.data ?? d)).catch(() => []),
    ];
    Promise.all(calls).then(([projects, clients]) => {
      if (!active) return;
      const cmds = [];
      projects.forEach((p) => {
        if (!p?.id) return;
        cmds.push({
          id: `proj-${p.id}`,
          label: `Open project: ${p.name}`,
          group: 'Projects',
          icon: FolderKanban,
          run: () => navigate(`/clients/${p.client_id}/businesses/${p.client_business_id}/projects/${p.id}`),
        });
      });
      clients.forEach((c) => {
        if (!c?.id) return;
        cmds.push({
          id: `client-${c.id}`,
          label: `Open client: ${c.name || c.client_name}`,
          group: 'Clients',
          icon: Building2,
          run: () => navigate(`/clients/${c.id}`),
        });
      });
      setEntityCommands(cmds);
    });
    return () => { active = false; };
  }, [navigate]);

  const globalCommands = useMemo(() => {
    const role = user?.role;
    const navCmds = [
      { id: 'nav-mytasks', label: 'Go to My Tasks', group: 'Navigate', icon: CheckSquare, run: () => navigate('/tasks/my'), roles: ['employee', 'department_head', 'admin', 'super_admin'] },
      { id: 'nav-tasks', label: 'Go to Tasks & Projects', group: 'Navigate', icon: FolderKanban, run: () => navigate('/tasks'), roles: ['admin', 'super_admin', 'department_head'] },
      { id: 'nav-courses', label: 'Go to Courses', group: 'Navigate', icon: BookOpen, run: () => navigate('/courses') },
      { id: 'nav-sops', label: 'Go to SOPs', group: 'Navigate', icon: FileText, run: () => navigate('/sops') },
      { id: 'nav-clients', label: 'Go to Clients', group: 'Navigate', icon: Building2, run: () => navigate('/clients'), roles: ['admin', 'super_admin', 'department_head'] },
      { id: 'nav-messaging', label: 'Go to Messaging', group: 'Navigate', icon: MessageSquare, run: () => navigate('/messaging') },
      { id: 'nav-announcements', label: 'Go to Announcements', group: 'Navigate', icon: Megaphone, run: () => navigate('/announcements') },
      { id: 'nav-events', label: 'Go to Events', group: 'Navigate', icon: Calendar, run: () => navigate('/events'), roles: ['super_admin'] },
      { id: 'nav-profile', label: 'Go to Profile', group: 'Navigate', icon: User, run: () => navigate('/profile') },
      { id: 'nav-settings', label: 'Go to Settings', group: 'Navigate', icon: Settings, run: () => navigate(isDepartmentHead ? '/employee/settings' : '/settings'), roles: ['admin', 'super_admin', 'department_head'] },
      { id: 'nav-users', label: 'Go to User Management', group: 'Navigate', icon: Users, run: () => navigate('/users'), roles: ['admin', 'super_admin', 'department_head'] },
    ].filter((c) => !c.roles || c.roles.includes(role));
    const createCmds = [
      { id: 'qc-task', label: 'Create new task', group: 'Create', icon: CheckSquare, run: () => window.dispatchEvent(new CustomEvent('app:quick-create', { detail: { type: 'task' } })) },
      { id: 'qc-project', label: 'Create new project', group: 'Create', icon: FolderKanban, run: () => window.dispatchEvent(new CustomEvent('app:quick-create', { detail: { type: 'project' } })) },
      { id: 'qc-business', label: 'Create new business', group: 'Create', icon: Building2, run: () => window.dispatchEvent(new CustomEvent('app:quick-create', { detail: { type: 'business' } })) },
      { id: 'qc-client', label: 'Create new client', group: 'Create', icon: Building2, run: () => window.dispatchEvent(new CustomEvent('app:quick-create', { detail: { type: 'client' } })) },
    ];
    return [...navCmds, ...createCmds, ...entityCommands];
  }, [entityCommands, user?.role, navigate, isDepartmentHead]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (!typing && e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && e.altKey === false) {
        // Reserve the single-key `N` shortcut for task creation only where it
        // was already established (Tasks page). Globally we leave `N` alone to
        // avoid hijacking typing in unrelated contexts.
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    <NavigationProvider>
    {/* Canvas — light gray plate the boxed app shell floats on. */}
    <div
      className={cn(
        "app-canvas",
        "flex w-full min-h-[100dvh]",
        "transition-colors duration-300"
      )}
    >
      {/* Boxed app shell — sidebar + header + content inside one rounded card. */}
      <div
        className={cn(
          /* overflow-clip removed: it made .app-shell the clip/scroll context
             and broke `position: sticky` for the header (content bled through),
             while also clipping the card to a fixed box. Rounded corners are now
             applied per-edge on the outer elements instead (see Sidebar's
             border-radius via .app-shell > aside, the header's rounded-tr, and
             the footer's rounded-br). */
          "app-shell",
          "relative flex min-h-full flex-1 min-w-0",
          "text-[var(--text-primary)]",
          "transition-colors duration-300"
        )}
        // Drive --sidebar-width from the main sidebar's real width so the
        // SecondarySidebar's `left` offset tracks it: when the main sidebar
        // collapses to 72px the secondary panel slides in beside it instead of
        // staying pinned at 260px and overlapping the collapsed rail.
        style={{ '--sidebar-width': collapsed ? '72px' : '260px' }}
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
          onToggleCollapse={() => setCollapsed((v) => !v)}
          onCollapseSidebar={() => setCollapsed(true)}
        />
        )}
        <SecondarySidebar collapsed={collapsed} />
        <div className="flex-1 min-w-0 flex flex-col">
          <header
            className={cn(
              /* sticky top-0: the header scrolls with the page like a normal
                 block until its top edge reaches the viewport's top, then it
                 pins in place for the rest of the scroll — the "moves up, then
                 locks" behavior in pure CSS. z-30 keeps it above page content
                 but below the mobile menu overlay (z-40) and the sidebar (z-50). */
              "sticky top-0 z-30 shrink-0 flex items-center gap-2 sm:gap-3 lg:px-6 h-[var(--header-height)] lg:rounded-tr-[var(--app-shell-radius)]",
              "border-b border-[var(--header-border)]",
              "bg-[var(--header-bg)] backdrop-blur"
            )}
          >
            <div className="flex items-center gap-2 px-3 sm:px-4 h-full min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--header-fg)] hover:text-[var(--header-fg)] hover:bg-[var(--header-hover-bg)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--header-focus-ring)] lg:hidden"
                )}
              >
                <Menu size={20} />
              </button>

              <SecondaryNavMobileTrigger />

              {/* Greeting — only on the dashboard, no blue fill. */}
              {location.pathname === "/" && (
                <div className="hidden md:flex shrink-0 items-center gap-2 whitespace-nowrap">
                  <span aria-hidden="true" className="text-lg leading-none">👋</span>
                  <p className="text-sm leading-none">
                    <span className="text-[var(--header-fg-muted)]">{greetingWord}, </span>
                    <span className="font-semibold text-[var(--header-fg)]">{greetingName}</span>
                  </p>
                </div>
              )}
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
                        "relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--header-fg)]",
                        "hover:text-[var(--header-fg)] hover:bg-[var(--header-hover-bg)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--header-focus-ring)]",
                        active && "text-[var(--color-primary)] bg-[var(--header-active-bg)]"
                      )}
                    >
                      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                      {badgeCount > 0 && <NotificationBadge count={badgeCount} muted={quietHours} />}
                    </button>
                  );
                })}
              </div>

              <TaskCommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={globalCommands} />

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
                          onClick={() => { setProfileOpen(false); navigate(isDepartmentHead || user?.role === 'admin' ? '/employee/settings' : '/settings'); }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <Settings size={14} /> Settings
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

          <main
            id="main-content"
            ref={mainScrollRef}
            className={cn(
              /* pt-[var(--header-height)] removed: the header now reserves its
                 own space in normal flow as a sticky element, so this hack is no
                 longer needed and can't drift out of sync with the header's real
                 height (the root cause of the top-of-box overlap bug). */
              "flex-1 min-w-0 flex flex-col pb-16 lg:pb-0",
              "transition-all duration-200 ease-out"
            )}
          >
          <Scrollbar variant="viewport">
          <div className="w-full px-4 sm:px-6 pt-4 sm:pt-6 pb-8 sm:pb-10 flex-1">
            {isDashboard && <BannerSection items={[...activeBanners, ...contextualBanners]} />}
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>

          <footer className="border-t border-[var(--border)] bg-[var(--app-shell-bg)] py-2.5 text-center lg:rounded-br-[var(--app-shell-radius)]">
            <p className="text-[11px] sm:text-xs text-neutral-400">
              © {new Date().getFullYear()} SOP Training Platform. All rights reserved.
            </p>
          </footer>
          </Scrollbar>
          </main>
        </div>

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
    </div>
    <SecondaryNavRouteSync />
    </NavigationProvider>
  );
}
