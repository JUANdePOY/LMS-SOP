import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/sidebar/Sidebar";
import { useTheme } from "@/hooks/useTheme";

/**
 * AppLayout
 * - Owns collapse state so both Sidebar AND <main> react to it
 * - ml-[260px] expanded → ml-[64px] collapsed, transitions in sync
 */
export default function AppLayout() {
  const { isDark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "flex min-h-screen",
        "bg-neutral-50 text-neutral-900",
        "dark:bg-neutral-950 dark:text-neutral-100",
        "transition-colors duration-300"
      )}
    >
      {/* Sidebar — controlled collapse owned here */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Main — margin synced with sidebar width */}
      <main
        id="main-content"
        className={cn(
          "flex-1 min-h-screen flex flex-col",
          "transition-all duration-200 ease-out",
          collapsed ? "ml-[64px]" : "ml-[260px]"
        )}
      >
        {/* Top bar */}
        <header
          className={cn(
            "sticky top-0 z-30 flex h-14 items-center justify-end px-6",
            "border-b border-neutral-200 dark:border-neutral-800",
            "bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md",
            "transition-colors duration-300"
          )}
        >
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
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}