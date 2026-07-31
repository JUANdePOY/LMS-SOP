import { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  PanelLeftClose,
  PanelRightClose,
  Search,
  Bell,
  Mail,
  Calendar,
  Home,
  BookOpen,
  FileText,
  Users,
  BarChart3,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/shared/components/navigation/sidebar/Sidebar";
import { useTheme } from "@/hooks/useTheme";
import { Scrollbar } from "@/shared/components/ui/Scrollbar";

const MOBILE_BOTTOM_NAV_ADMIN = [
  { name: "Home", path: "/", icon: Home },
  { name: "Courses", path: "/courses", icon: BookOpen },
  { name: "SOPs", path: "/sops", icon: FileText },
  { name: "Users", path: "/settings/users", icon: Users },
  { name: "Reports", path: "/reports", icon: BarChart3 },
];

const MOBILE_BOTTOM_NAV_EMPLOYEE = [
  { name: "Home", path: "/", icon: Home },
  { name: "Library", path: "/courses/library", icon: BookOpen },
  { name: "SOPs", path: "/sops", icon: FileText },
  { name: "Profile", path: "/profile", icon: Users },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const isEmployee = user?.role === 'employee';
  const mobileNav = isEmployee ? MOBILE_BOTTOM_NAV_EMPLOYEE : MOBILE_BOTTOM_NAV_ADMIN;


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
              "sticky top-0 z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 h-14",
              "border-b border-[var(--border)]",
              "bg-[var(--bg-topbar)]",
              "transition-colors duration-300"
            )}
          >
            <button
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex h-9 w-9 items-center justify-center text-white/70 hover:text-white transition-colors duration-150"
            >
              {collapsed ? (
                <PanelRightClose size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}
            </button>

            

            <div className="flex-1 max-w-md mx-auto hidden md:block">
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
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                <Bell size={18} />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">3</span>
              </button>
              <button
                aria-label="Messages"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                <Mail size={18} />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">5</span>
              </button>
              <button
                aria-label="Calendar"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                <Calendar size={18} />
              </button>
              <button
                onClick={toggleTheme}
                aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
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