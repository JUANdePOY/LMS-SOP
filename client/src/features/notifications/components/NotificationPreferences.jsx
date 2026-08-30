import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Monitor,
  Smartphone,
  Mail,
  Volume2,
  Moon,
  CheckSquare,
  AtSign,
  AlertTriangle,
  Settings as SettingsIcon,
  MessageSquare,
  GraduationCap,
  Shield,
  Megaphone,
  Loader2,
  Save,
} from "lucide-react";
import { getNotificationPreferences, updateNotificationPreferences } from "@/services/api";
import { usePushNotifications } from "@/features/notifications/hooks/usePushNotifications";
import { useToast } from "@/shared/components/ui/Toast";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
} from "../constants/notificationOptions";

const ICONS = {
  Monitor,
  Smartphone,
  Mail,
  Volume2,
  CheckSquare,
  AtSign,
  AlertTriangle,
  Settings: SettingsIcon,
  MessageSquare,
  GraduationCap,
  Shield,
  Megaphone,
};

const DEFAULT_PREFS = {
  categories: {},
  channels: { in_app: true, push: true, email: false, sound: true },
  quiet_hours_enabled: 0,
  quiet_hours_start: "22:00:00",
  quiet_hours_end: "07:00:00",
  timezone: "UTC",
};

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-[var(--color-primary)]" : "bg-neutral-300 dark:bg-neutral-600",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-1"
        )}
      />
    </button>
  );
}

function toTimeInput(value) {
  return (value || "00:00:00").slice(0, 5);
}

function fromTimeInput(value) {
  return `${value || "00:00"}:00`;
}

export default function NotificationPreferences() {
  const { toast } = useToast();
  const { requestPermission, unsubscribe } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getNotificationPreferences();
      const data = res.data?.preferences || {};
      setPrefs({
        categories: data.categories || DEFAULT_PREFS.categories,
        channels: { ...DEFAULT_PREFS.channels, ...(data.channels || {}) },
        quiet_hours_enabled: data.quiet_hours_enabled || 0,
        quiet_hours_start: data.quiet_hours_start || DEFAULT_PREFS.quiet_hours_start,
        quiet_hours_end: data.quiet_hours_end || DEFAULT_PREFS.quiet_hours_end,
        timezone: data.timezone || DEFAULT_PREFS.timezone,
      });
    } catch {
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const update = (patch) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const toggleCategory = (key) =>
    update({ categories: { ...prefs.categories, [key]: !prefs.categories[key] } });

  const toggleChannel = async (key) => {
    const next = !prefs.channels[key];
    update({ channels: { ...prefs.channels, [key]: next } });
    if (key === "push") {
      try {
        if (next) await requestPermission();
        else await unsubscribe();
      } catch (err) {
        toast.error(err?.message || "Could not update push subscription");
      }
    }
  };

  const toggleQuietHours = () =>
    update({ quiet_hours_enabled: prefs.quiet_hours_enabled ? 0 : 1 });

  const save = async () => {
    setSaving(true);
    try {
      await updateNotificationPreferences({
        categories: prefs.categories,
        channels: prefs.channels,
        quiet_hours_enabled: prefs.quiet_hours_enabled ? 1 : 0,
        quiet_hours_start: prefs.quiet_hours_start,
        quiet_hours_end: prefs.quiet_hours_end,
        timezone: prefs.timezone,
      });
      toast.success("Notification preferences saved");
      setDirty(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-secondary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery channels */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Bell size={16} className="text-[var(--color-primary)]" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Delivery Methods
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {NOTIFICATION_CHANNELS.map((ch) => {
            const Icon = ICONS[ch.icon];
            return (
              <div
                key={ch.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  {Icon && <Icon size={16} className="text-neutral-500" />}
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {ch.label}
                    </p>
                    <p className="text-xs text-neutral-500">{ch.description}</p>
                  </div>
                </div>
                <Switch
                  checked={Boolean(prefs.channels[ch.key])}
                  onChange={() => toggleChannel(ch.key)}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Notification types */}
      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Notification Types
          </h3>
          <p className="text-xs text-neutral-500">
            Choose which notifications you want to receive.
          </p>
        </div>
        <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {NOTIFICATION_CATEGORIES.map((cat) => {
            const Icon = ICONS[cat.icon];
            return (
              <div
                key={cat.key}
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <div className="flex items-center gap-2.5">
                  {Icon && <Icon size={16} className="text-neutral-500" />}
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {cat.label}
                    </p>
                    <p className="text-xs text-neutral-500">{cat.description}</p>
                  </div>
                </div>
                <Switch
                  checked={Boolean(prefs.categories[cat.key])}
                  onChange={() => toggleCategory(cat.key)}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Quiet hours */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Moon size={16} className="text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Quiet Hours
            </h3>
          </div>
          <Switch checked={Boolean(prefs.quiet_hours_enabled)} onChange={toggleQuietHours} />
        </div>
        {Boolean(prefs.quiet_hours_enabled) && (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              From
              <input
                type="time"
                value={toTimeInput(prefs.quiet_hours_start)}
                onChange={(e) =>
                  update({ quiet_hours_start: fromTimeInput(e.target.value) })
                }
                className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-sm text-neutral-800 dark:text-neutral-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
              To
              <input
                type="time"
                value={toTimeInput(prefs.quiet_hours_end)}
                onChange={(e) =>
                  update({ quiet_hours_end: fromTimeInput(e.target.value) })
                }
                className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 text-sm text-neutral-800 dark:text-neutral-100"
              />
            </label>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
