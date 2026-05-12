import { useState } from "react";
import { CheckCircle2, XCircle, Users, Tag, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHierarchy } from "./HierarchyContext";
import MembersModal from "./MembersModal";

function StatusBadge({ status }) {
  const isActive = status === "active";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
      isActive
        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
        : "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700"
    )}>
      {isActive ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

/**
 * SquadronList — Level 4 (leaf)
 * Each card is clickable → opens MembersModal for that squadron.
 */
export default function SquadronList({ squadrons }) {
  const { selectedSquadron, selectSquadron } = useHierarchy();
  const [modalNode, setModalNode] = useState(null);

  if (!squadrons?.length) {
    return <p className="py-3 text-xs text-neutral-400 italic">No squadrons found.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {squadrons.map((sq) => {
          const isSelected = selectedSquadron?.id === sq.id;

          return (
            <button
              key={sq.id}
              onClick={() => {
                selectSquadron(sq);
                setModalNode(sq);
              }}
              title="Click to view members"
              className={cn(
                "group relative flex flex-col gap-2 rounded-lg border p-3 text-left",
                "transition-all duration-150 outline-none",
                "focus-visible:ring-2 focus-visible:ring-indigo-500/50",
                isSelected
                  ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500/40 dark:bg-indigo-500/10 shadow-sm"
                  : "border-neutral-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
              )}
            >
              {isSelected && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-indigo-500 dark:bg-indigo-400" />
              )}

              {/* Name + status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={cn(
                    "text-[13px] font-bold leading-tight",
                    isSelected
                      ? "text-indigo-700 dark:text-indigo-300"
                      : "text-neutral-800 dark:text-neutral-200"
                  )}>
                    {sq.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[9px] text-neutral-400">{sq.code}</p>
                </div>
                <StatusBadge status={sq.status} />
              </div>

              {/* Location */}
              <div className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-600">
                <MapPin size={9} className="shrink-0" />
                <span className="truncate">{sq.location}</span>
              </div>

              {/* Members + specialization */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <Users size={9} /> {sq.members} members
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-600">
                    <Tag size={9} /> {sq.specialization}
                  </span>
                </div>

                {/* View hint */}
                <span className="text-[9px] text-indigo-400 dark:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  View members →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Members Modal */}
      <MembersModal
        open={!!modalNode}
        node={modalNode}
        nodeType="squadron"
        onClose={() => setModalNode(null)}
      />
    </>
  );
}