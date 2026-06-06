import { useState } from "react";
import { Outlet, useMatches } from "react-router-dom";
import { Sun, Moon, Menu, X, PanelRightClose, PanelLeftClose, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/navigation/sidebar/Sidebar";
import { useTheme } from "@/hooks/useTheme";

export default function AppLayout() {
  const { isDark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const matches = useMatches();
  const routeMatch = matches[matches.length - 1];
  const pageTitle = routeMatch?.handle?.title || null;

  return (
    <div
      className={cn(
        "flex min-h-screen",
        "bg-[var(--bg-page)] text-[var(--text-primary)]",
        "transition-colors duration-300"
      )}
    >
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[var(--bg-cover-overlay)] backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

{/* Sidebar */}
       <Sidebar
         collapsed={collapsed}
         mobileOpen={mobileOpen}
         onMobileClose={() => setMobileOpen(false)}
       />

      {/* Main */}
      <main
        id="main-content"
        className={cn(
          "flex-1 min-h-screen flex flex-col",
          "transition-all duration-200 ease-out",
          collapsed ? "lg:ml-[64px]" : "lg:ml-[260px]",
          "ml-0"
        )}
      >
        {/* Top bar */}
        <header
          className={cn(
            "sticky top-0 z-30 flex h-14 items-center gap-3 px-4 lg:px-2",
            "border-b border-[var(--border)]",
            "bg-[var(--glass-bg)] backdrop-blur-md",
            "transition-colors duration-300"
          )}
        >
{/* Sidebar toggle - desktop only */}
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

{/* Mobile: hamburger + title */}
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
              PAFR
            </span>
          </div>

{/* Page Title - Desktop */}
          {pageTitle && (
            <div className="hidden lg:flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent-amber)_10%,transparent)]">
                <GraduationCap size={18} className="text-[var(--accent-amber)]" />
              </div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">{pageTitle}</h1>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              "border border-[var(--border)]",
              "bg-[var(--bg-surface)]",
              "text-[var(--text-secondary)]",
              "hover:text-[var(--text-primary)]",
              "hover:bg-[var(--bg-hover)]",
              "transition-all duration-200 group",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-amber)]"
            )}
          >
            {isDark ? (
              <Sun
                size={16}
                strokeWidth={1.8}
                className="transition-transform duration-300 group-hover:rotate-45"
              />
            ) : (
              <Moon
                size={16}
                strokeWidth={1.8}
                className="transition-transform duration-300 group-hover:-rotate-12"
              />
            )}
          </button>
        </header>

        {/* Page content */}
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
