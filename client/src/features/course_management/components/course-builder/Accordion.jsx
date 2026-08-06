import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Lightweight accessible accordion section used to progressively disclose
 * advanced lesson options (chapters, thumbnail) without cluttering the
 * primary editing surface.
 */
export default function Accordion({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `acc-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          {Icon && <Icon size={16} className="text-neutral-400" />}
          {title}
        </span>
        <ChevronDown
          size={16}
          className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div id={panelId} className="border-t border-neutral-100 px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
}
