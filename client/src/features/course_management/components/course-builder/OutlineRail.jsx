import { ListTree } from "lucide-react";

/**
 * Collapsible outline rail for reading lessons. Shows headings extracted
 * from content blocks and lets the author jump to a section. Purely a
 * navigation aid — it does not edit content.
 */
export default function OutlineRail({ items, onJump }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex items-center gap-2 text-neutral-400">
          <ListTree size={16} />
          <span className="font-medium">Outline</span>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Add a Heading (H2) inside a text block to build an outline.
        </p>
      </div>
    );
  }

  return (
    <nav aria-label="Lesson outline" className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-2 flex items-center gap-2 px-1 text-sm font-medium text-neutral-700 dark:text-neutral-200">
        <ListTree size={16} className="text-neutral-400" />
        Outline
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onJump(item.id)}
              className="block w-full truncate rounded-md px-2 py-1 text-left text-sm text-neutral-600 hover:bg-neutral-100 hover:text-[var(--color-primary-hover)] dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              title={item.text}
            >
              {item.text || "Untitled section"}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
