/**
 * Canonical action icon set.
 *
 * Every row/card action across the app (SOP management, course management,
 * assessments, ...) must import its icon from here instead of hand-rolling an
 * inline <svg> or picking an arbitrary lucide alias. This is what keeps "Edit"
 * looking like the same pencil everywhere instead of a pencil in one table and
 * a square-pen in the next.
 *
 * Usage:
 *   import { ActionIcons } from "@/shared/components/ui/actionIcons";
 *   <ActionIcons.Edit className="h-4 w-4" />
 *
 * Or, preferably, use the <ActionButton> wrapper below so sizing, hover colour
 * and a11y labelling stay consistent too.
 */
import {
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  UserPlus,
  Send,
  Eye,
  Plus,
  Copy,
  Download,
  Share2,
  Save,
  X,
  Check,
  RefreshCw,
  MoreVertical,
  GripVertical,
  List,
  ArrowUp,
  ArrowDown,
  Settings,
} from "lucide-react";

export const ActionIcons = {
  Edit: Pencil,
  Delete: Trash2,
  Archive: Archive,
  Unarchive: ArchiveRestore,
  Assign: UserPlus,
  Publish: Send,
  View: Eye,
  Add: Plus,
  Duplicate: Copy,
  Download: Download,
  Share: Share2,
  Reorder: List,
  Save: Save,
  Cancel: X,
  Confirm: Check,
  Refresh: RefreshCw,
  More: MoreVertical,
  Drag: GripVertical,
  MoveUp: ArrowUp,
  MoveDown: ArrowDown,
  Settings: Settings,
};

/**
 * Semantic hover/text colour per action, so a Delete button is always rose and
 * an Archive is always amber regardless of which feature renders it.
 */
export const ACTION_TONES = {
  neutral:
    "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800",
  primary:
    "text-neutral-500 hover:text-brand hover:bg-[rgba(242,92,5,0.10)] dark:text-neutral-400 dark:hover:text-[var(--color-primary)] dark:hover:bg-[rgba(242,92,5,0.18)]",
  warning:
    "text-neutral-500 hover:text-warning hover:bg-warning-soft dark:text-neutral-400 dark:hover:text-[var(--color-warning)] dark:hover:bg-warning-soft",
  danger:
    "text-neutral-500 hover:text-danger hover:bg-danger-soft dark:text-neutral-400 dark:hover:text-[var(--color-danger)] dark:hover:bg-danger-soft",
  success:
    "text-neutral-500 hover:text-success hover:bg-success-soft dark:text-neutral-400 dark:hover:text-[var(--color-success)] dark:hover:bg-success-soft",
};

/** Default tone for each named action. */
export const ACTION_TONE_BY_NAME = {
  Edit: "primary",
  Delete: "danger",
  Archive: "warning",
  Unarchive: "warning",
  Assign: "primary",
  Publish: "warning",
  View: "primary",
  Add: "primary",
  Duplicate: "neutral",
  Download: "neutral",
  Share: "neutral",
  Save: "success",
  Cancel: "neutral",
  Confirm: "success",
  Refresh: "neutral",
  More: "neutral",
  Drag: "neutral",
  Reorder: "neutral",
  MoveUp: "neutral",
  MoveDown: "neutral",
  Settings: "neutral",
};

const SIZES = {
  sm: { button: "p-1", icon: "h-3.5 w-3.5" },
  md: { button: "p-1.5", icon: "h-4 w-4" },
  lg: { button: "p-2", icon: "h-5 w-5" },
};

/**
 * Standard icon-only action button.
 *
 * <ActionButton action="Edit" onClick={...} />
 * <ActionButton action="Delete" label="Delete SOP" onClick={...} />
 */
export function ActionButton({
  action,
  label,
  tone,
  size = "md",
  className = "",
  disabled = false,
  ...props
}) {
  const Icon = ActionIcons[action];
  if (!Icon) {
    throw new Error(
      `ActionButton: unknown action "${action}". Add it to ActionIcons first.`
    );
  }

  const sizing = SIZES[size] || SIZES.md;
  const toneClass =
    ACTION_TONES[tone || ACTION_TONE_BY_NAME[action] || "neutral"];
  const accessibleLabel = label || action;

  return (
    <button
      type="button"
      title={accessibleLabel}
      aria-label={accessibleLabel}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-md ${sizing.button} ${toneClass} transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      <Icon className={sizing.icon} />
    </button>
  );
}

export default ActionIcons;
