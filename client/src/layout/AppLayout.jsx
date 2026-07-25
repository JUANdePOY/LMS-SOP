import { useState, useEffect } from "react";
import { Outlet, useMatches } from "react-router-dom";
import {
  PanelLeftClose,
  PanelRightClose,
  Menu,
  X,
  Search,
  Bell,
  Mail,
  Calendar,
  ChevronDown,
  LogOut,
  Settings,
  User,
  LayoutDashboard,
  Home,
  BookOpen,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/navigation/sidebar/Sidebar";
import { ThemeToggle } from "@/theme/components/ThemeToggle";

const MOBILE_BOTTOM_NAV = [
  { name: "Home", path: "/", icon: Home },
  { name: "Courses", path: "/courses", icon: BookOpen },
  { name: "SOPs", path: "/sops", icon: FileText },
  { name: "Users", path: "/users", icon: Users },
  { name: "Reports", path: "/reports", icon: BarChart3 },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const matches = useMatches();
  const routeMatch = matches[matches.length - 1];
  const pageTitle = routeMatch?.handle?.title || null;
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        <header
          className={cn(
            "sticky top-0 z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 h-14",
            "border-b border-[var(--border)]",
            "bg-[var(--glass-bg)] backdrop-blur-md",
            "transition-colors duration-300"
          )}
        >
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-150"
          >
            {collapsed ? (
              <PanelRightClose size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </button>

          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                "border border-[var(--border)]",
                "bg-[var(--bg-surface)]",
                "text-[var(--text-secondary)]",
                "hover:bg-[var(--bg-hover)]",
                "transition-colors duration-150"
              )}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
                <LayoutDashboard size={16} className="text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                SOP
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10">
              <LayoutDashboard size={18} className="text-blue-600" />
            </div>
            <h1 className="text-base font-bold text-[var(--text-primary)]">
              {pageTitle || 'Dashboard'}
            </h1>
          </div>

          <div className="flex-1 max-w-xl mx-auto hidden md:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search users, SOPs, trainings, tasks…"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-9 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              aria-label="Notifications"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">3</span>
            </button>
            <button
              aria-label="Messages"
              className="relative hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Mail size={18} />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">5</span>
            </button>
            <button
              aria-label="Calendar"
              className="hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Calendar size={18} />
            </button>
            <ThemeToggle />
          </div>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="User menu"
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-xs font-medium text-[var(--text-primary)] leading-none">
                  {user?.full_name || 'User'}
                </span>
                <span className="text-[10px] text-neutral-500 leading-none mt-0.5">
                  {user?.role?.replace('_', ' ') || ''}
                </span>
              </div>
              <ChevronDown size={14} className="text-neutral-400 hidden lg:block" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 shadow-lg py-1">
                  <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{user?.full_name || 'User'}</p>
                    <p className="text-[10px] text-neutral-500">{user?.email || ''}</p>
                  </div>
                  <button className="flex w-full items-center gap-2 px-4 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <User size={14} /> Profile
                  </button>
                  <button className="flex w-full items-center gap-2 px-4 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                    <Settings size={14} /> Settings
                  </button>
                  <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                  <button
                    onClick={() => { setUserMenuOpen(false); logout(); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 w-full">
          <Outlet />
        </div>

        <footer className="border-t border-[var(--border)] py-2.5 text-center">
          <p className="text-[11px] sm:text-xs text-neutral-400">
            © {new Date().getFullYear()} SOP Training Platform. All rights reserved.
          </p>
        </footer>
      </main>

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
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active = window.location.pathname === item.path || (item.path !== '/' && window.location.pathname.startsWith(item.path));
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
