import { ExternalLink, Link2, AlertTriangle, CheckCircle2, Globe } from "lucide-react";

function isValidUrl(value) {
  if (!value || !value.trim()) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function hostOf(value) {
  try {
    return new URL(value.trim()).host;
  } catch {
    return "";
  }
}

/**
 * Live, validated preview for a link lesson URL.
 * Shows validation state, the resolved host, a favicon, and an open affordance.
 */
export default function LinkPreview({ url, title }) {
  const trimmed = (url || "").trim();
  const valid = isValidUrl(trimmed);
  const host = hostOf(trimmed);
  const display = title?.trim() || host || trimmed;
  const favicon = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` : null;

  if (!trimmed) {
    return (
      <div className="flex aspect-[2.4/1] w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-center">
        <div className="space-y-2 px-4">
          <Link2 size={28} className="mx-auto text-neutral-300" />
          <p className="text-sm text-neutral-500">Paste an external link to preview it here</p>
        </div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="flex aspect-[2.4/1] w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-center">
        <div className="space-y-2 px-4">
          <AlertTriangle size={28} className="mx-auto text-red-400" />
          <p className="text-sm font-medium text-red-700">Invalid link</p>
          <p className="text-xs text-red-500">Enter a full URL starting with http:// or https://</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <a
        href={trimmed}
        target="_blank"
        rel="noreferrer noopener"
        className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-[rgba(242,92,5,0.30)] hover:bg-[rgba(242,92,5,0.08)]/40"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
          {favicon ? (
            <img src={favicon} alt="" className="h-6 w-6" loading="lazy" />
          ) : (
            <Globe size={20} className="text-neutral-400" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {display}
          </span>
          <span className="block truncate text-xs text-neutral-500">{trimmed}</span>
        </span>
        <ExternalLink size={16} className="shrink-0 text-neutral-400 transition-colors group-hover:text-[var(--color-primary)]" />
      </a>

      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
        <CheckCircle2 size={12} /> External link · {host}
      </span>
    </div>
  );
}

export { isValidUrl };
