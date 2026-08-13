import { useMemo } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme, SYSTEM, DARK, LIGHT, THEMES } from "@/theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        <Icon size={18} />
      </div>
      <div>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </div>
    </div>
  );
}

export default function AppearanceSettings() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === DARK;

  const themeLabel = useMemo(() => {
    if (theme === SYSTEM) return "System";
    if (theme === DARK) return "Dark";
    return "Light";
  }, [theme]);

  const description = useMemo(() => {
    if (theme === SYSTEM) {
      return `Following your device (currently ${resolvedTheme})`;
    }
    return isDark ? "Currently using dark theme" : "Currently using light theme";
  }, [theme, resolvedTheme, isDark]);

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          icon={resolvedTheme === DARK ? Moon : Sun}
          title="Appearance"
          description={description}
        />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-xs text-neutral-500">
            Choose how the app appearance adapts to your preference.
          </p>
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-0.5 w-fit">
            {THEMES.map((t) => {
              const label = t === SYSTEM ? "System" : t === DARK ? "Dark" : "Light";
              const active = theme === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-label={`Set theme to ${label}`}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  )}
                >
                  {t === SYSTEM ? (
                    <Sun size={12} className={cn(resolvedTheme === DARK && "opacity-0")} />
                  ) : t === DARK ? (
                    <Moon size={12} />
                  ) : (
                    <Sun size={12} />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-neutral-400">
            Current: <span className="font-medium">{themeLabel}</span>
            {theme === SYSTEM && (
              <span className="ml-1">(resolved: {resolvedTheme})</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
