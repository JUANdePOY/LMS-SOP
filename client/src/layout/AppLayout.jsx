import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sun, Moon, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/navigation/sidebar/Sidebar";
import { useTheme } from "@/hooks/useTheme";

export default function AppLayout() {
  const { isDark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className={cn(
        "flex min-h-screen",
        "bg-neutral-50 text-neutral-900",
        "dark:bg-neutral-950 dark:text-neutral-100",
        "transition-colors duration-300"
      )}
    >
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
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
            "sticky top-0 z-30 flex h-14 items-center justify-between gap-3 px-4 lg:px-6",
            "border-b border-neutral-200 dark:border-neutral-800",
            "bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md",
            "transition-colors duration-300"
          )}
        >
          {/* Mobile: hamburger + title */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                "border border-neutral-200 dark:border-neutral-700",
                "bg-white dark:bg-neutral-800",
                "text-neutral-600 dark:text-neutral-400",
                "hover:bg-neutral-100 dark:hover:bg-neutral-700",
                "transition-colors duration-150"
              )}
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <span className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              PAFR
            </span>
          </div>

          {/* Spacer for desktop */}
          <div className="hidden lg:block" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              "border border-neutral-200 dark:border-neutral-700",
              "bg-white dark:bg-neutral-800",
              "text-neutral-500 dark:text-neutral-400",
              "hover:text-neutral-900 dark:hover:text-neutral-50",
              "hover:bg-neutral-100 dark:hover:bg-neutral-700",
              "transition-all duration-200 group",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
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
