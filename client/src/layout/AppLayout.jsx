import { useState } from "react";
import { Outlet, useMatches } from "react-router-dom";
import { Sun, Moon, Menu, X, PanelRightClose, PanelLeftClose, Search, Bell, Mail, Calendar, ChevronDown, LogOut, Settings, User, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/navigation/sidebar/Sidebar";
import { useTheme } from "@/hooks/useTheme";

export default function AppLayout() {
  const { isDark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const matches = useMatches();
  const routeMatch = matches[matches.length - 1];
  const pageTitle = routeMatch?.handle?.title || null;
  const { user, logout } = useAuth();

  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={cn(
        "flex min-h-screen",
        "bg-[var(--bg-page)] text-[var(--text-primary)]",
        "transition-colors duration-300"
      )}
    >
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--bg-cover-overlay)] backdrop-blur-sm lg:hidden"
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
          "flex-1 min-h-screen flex flex-col",
          "transition-all duration-200 ease-out",
          collapsed ? "lg:ml-[64px]" : "lg:ml-[260px]",
          "ml-0"
        )}
      >
        <header
          className={cn(
            "sticky top-0 z-30 flex h-14 items-center gap-3 px-4 lg:px-2",
            "border-b border-[var(--border)]",
            "bg-[var(--glass-bg)] backdrop-blur-md",
            "transition-colors duration-300"
          )}
        >
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden lg:flex h-9 w-9 items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            {collapsed ? (
              <PanelLeftClose size={22} />
            ) : (
              <PanelRightClose size={22} />
            )}
          </button>

          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                "border border-[var(--border)]",
                "bg-[var(--bg-surface)]",
                "text-[var(--text-secondary)]",
                "hover:bg-[var(--bg-hover)]",
                "transition-colors duration-150"
              )}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              SOP TRAINING PLATFORM
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10">
              <LayoutDashboard size={18} className="text-blue-600" />
            </div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">SOP TRAINING PLATFORM</h1>
          </div>

          <div className="flex-1 max-w-md mx-auto hidden md:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search users, SOPs, trainings, tasks…"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-10 py-2 text-sm text-[var(--text-primary)] placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">3</span>
            </button>
            <button
              aria-label="Messages"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Mail size={18} />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">5</span>
            </button>
            <button
              aria-label="Calendar"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Calendar size={18} />
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="User menu"
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
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
              <ChevronDown size={14} className="text-neutral-400" />
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

        <div className="flex-1 p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>

        <footer className="border-t border-[var(--border)] py-3 text-center">
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} SOP Training Platform. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}