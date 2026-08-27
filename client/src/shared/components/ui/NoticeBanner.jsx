import { useCallback, useState } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Notice banner — compact, full-width rows for account/system messages
  (payment issues, subscription status, security prompts, …).

  Colors come from the `--notice-*` tokens in index.css so light/dark both work:
    row background   #EFF1F3        left accent  3px  #E39A3F
    message text     #3F4650        action btn   white / 1px #D8DCE1

  Rows are meant to stack directly on top of each other with no gaps and a
  hairline divider in between — use `NoticeBannerStack` for that.
*/

const TONES = {
  warning: { accent: "var(--notice-accent-warning)", glyph: "i" },
  info: { accent: "var(--notice-accent-info)", glyph: "i" },
  danger: { accent: "var(--notice-accent-danger)", glyph: "!" },
};

/**
 * A single notice row: left accent bar, circular badge, one-line message and an
 * optional action button plus an optional dismiss button.
 *
 * @param {object} props
 * @param {React.ReactNode} props.message      Message text (kept to a single line).
 * @param {string}   [props.actionLabel]       Label for the right-aligned action button.
 * @param {Function} [props.onAction]          Action handler. Omit (or omit actionLabel) to hide the button.
 * @param {Function} [props.onDismiss]         Dismiss handler. Omit to hide the dismiss button.
 * @param {boolean}  [props.actionLoading]     Shows a spinner and disables the action button.
 * @param {boolean}  [props.actionDisabled]    Disables the action button.
 * @param {'warning'|'info'|'danger'} [props.tone='warning']
 * @param {boolean}  [props.divided]           Draws the hairline divider on top (used when stacked).
 * @param {string}   [props.className]
 */
export function NoticeBanner({
  message,
  actionLabel,
  onAction,
  onDismiss,
  actionLoading = false,
  actionDisabled = false,
  tone = "warning",
  divided = false,
  className,
}) {
  const { accent, glyph } = TONES[tone] || TONES.warning;
  const showAction = Boolean(actionLabel && onAction);

  return (
    <div
      role="status"
      className={cn(
        "flex w-full items-center gap-2.5 sm:gap-3",
        "min-h-[46px] py-1.5 pl-2.5 pr-2.5 sm:pl-3 sm:pr-3",
        "border-l-[3px] bg-[var(--notice-bg)]",
        divided && "border-t border-t-[color:var(--notice-divider)]",
        className
      )}
      style={{ borderLeftColor: accent }}
    >
      <span
        aria-hidden="true"
        className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: accent }}
      >
        <span className="text-[11px] font-bold leading-none">{glyph}</span>
      </span>

      <p className="min-w-0 flex-1 truncate text-[13px] leading-tight text-[var(--notice-text)] sm:text-[14px]">
        {message}
      </p>

      {showAction && (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled || actionLoading}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5",
            "rounded-[6px] border border-[var(--notice-btn-border)] bg-[var(--notice-btn-bg)]",
            "px-2.5 py-1 text-[12px] font-medium text-[var(--notice-btn-text)]",
            "transition-colors hover:bg-[var(--bg-hover)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--notice-btn-border)]",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {actionLoading && <Loader2 size={12} className="animate-spin" />}
          {actionLabel}
        </button>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notice"
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
            "text-[var(--notice-text)] opacity-60",
            "transition-opacity hover:bg-[var(--bg-hover)] hover:opacity-100",
            "focus:outline-none focus:ring-2 focus:ring-[var(--notice-btn-border)]"
          )}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

/**
 * Stacks several notice rows into one seamless block: no gaps between rows, a
 * hairline divider between them, and independent dismiss/action state per row.
 *
 * Each item drives exactly one row:
 *   {
 *     id: 'payment',                          // required, used as the row key
 *     message: 'Your last payment failed.',
 *     actionLabel: 'Update payment method',
 *     onAction: () => {},                     // may return a promise -> row shows a spinner
 *     onDismiss: () => {},                    // optional, called on top of the internal hide
 *     dismissible: true,                      // false hides the dismiss button
 *     tone: 'warning',                        // 'warning' | 'info' | 'danger'
 *   }
 *
 * @param {object} props
 * @param {Array<object>} props.items          Rows to render, top to bottom.
 * @param {Function} [props.onAction]          Fallback action handler, receives the item.
 * @param {Function} [props.onDismiss]         Called with the item whenever a row is dismissed.
 * @param {string}   [props.className]
 */
export function NoticeBannerStack({ items = [], onAction, onDismiss, className }) {
  const [dismissedIDs, setDismissedIDs] = useState(() => []);
  const [pendingIDs, setPendingIDs] = useState(() => []);

  const handleDismiss = useCallback(
    (item) => {
      setDismissedIDs((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
      item.onDismiss?.(item);
      onDismiss?.(item);
    },
    [onDismiss]
  );

  const handleAction = useCallback(
    async (item) => {
      const handler = item.onAction || onAction;
      if (!handler) return;
      setPendingIDs((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
      try {
        await handler(item);
      } finally {
        setPendingIDs((prev) => prev.filter((id) => id !== item.id));
      }
    },
    [onAction]
  );

  const visible = items.filter((item) => item && !dismissedIDs.includes(item.id));
  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-[8px] border border-[var(--notice-divider)]",
        className
      )}
    >
      {visible.map((item, index) => (
        <NoticeBanner
          key={item.id ?? index}
          message={item.message}
          tone={item.tone}
          actionLabel={item.actionLabel}
          onAction={item.onAction || onAction ? () => handleAction(item) : undefined}
          onDismiss={item.dismissible === false ? undefined : () => handleDismiss(item)}
          actionLoading={pendingIDs.includes(item.id)}
          actionDisabled={item.actionDisabled}
          divided={index > 0}
        />
      ))}
    </div>
  );
}

export default NoticeBannerStack;
