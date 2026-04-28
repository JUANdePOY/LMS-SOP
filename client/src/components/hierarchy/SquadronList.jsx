import { CheckCircle2, XCircle, Users, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHierarchy } from "@/components/hierarchy/HierarchyContext";

/**
 * StatusBadge
 */
function StatusBadge({ status }) {
  const isActive = status === "active";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
      isActive
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
        : "bg-neutral-100 text-neutral-500 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700"
    )}>
      {isActive
        ? <CheckCircle2 size={9} className="shrink-0" />
        : <XCircle     size={9} className="shrink-0" />
      }
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

/**
 * SquadronList
 * Level 4 — final leaf nodes. Displays squadron cards with status.
 *
 * @param {{ squadrons: Squadron[] }} props
 */
export default function SquadronList({ squadrons }) {
  const { selectedSquadron, selectSquadron } = useHierarchy();

  if (!squadrons || squadrons.length === 0) {
    return (
      <p className="py-3 pl-2 text-xs text-neutral-400 dark:text-neutral-600 italic">
        No squadrons found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
      {squadrons.map((sq) => {
        const isSelected = selectedSquadron?.id === sq.id;

        return (
          <button
            key={sq.id}
            onClick={() => selectSquadron(sq)}
            className={cn(
              "group relative flex flex-col gap-2 rounded-lg border p-3 text-left",
              "transition-all duration-150 ease-out",
              "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50",
              isSelected
                ? [
                    "border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10",
                    "shadow-sm shadow-indigo-100 dark:shadow-none",
                  ]
                : [
                    "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50",
                    "dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/60",
                  ]
            )}
          >
            {/* Selected indicator */}
            {isSelected && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
            )}

            {/* Top row: name + status */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cn(
                  "text-[12px] font-semibold leading-tight",
                  isSelected
                    ? "text-indigo-700 dark:text-indigo-300"
                    : "text-neutral-800 dark:text-neutral-200"
                )}>
                  {sq.name}
                </p>
                <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-600 font-mono">
                  {sq.code}
                </p>
              </div>
              <StatusBadge status={sq.status} />
            </div>

            {/* Bottom row: members + specialization */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-500">
                <Users size={10} /> {sq.members} members
              </span>
              <span className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-600">
                <Tag size={10} /> {sq.specialization}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
