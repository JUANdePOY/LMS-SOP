import { useState } from "react";
import { ChevronRight, Users, Shield, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHierarchy } from "@/context/HierarchyContext";
import GroupAccordion from "./GroupAccordion";
import MembersModal from "./MembersModal";

export default function ArcenAccordion({ arcen }) {
  const { expandedArcenId, toggleArcen } = useHierarchy();
  const isOpen = expandedArcenId === arcen.id;
  const [modal, setModal] = useState(false);

  const totalSquadrons = arcen.groups.reduce((b, g) => b + g.squadrons.length, 0);

  return (
    <>
      <div className={cn(
        "rounded-xl border overflow-hidden transition-colors duration-150",
        isOpen
          ? "border-indigo-200 dark:border-indigo-500/30"
          : "border-neutral-200 dark:border-neutral-800"
      )}>
        {/* ── Header ────────────────────────────────────────────── */}
        <div className={cn(
          "flex w-full items-center gap-3 px-4 py-3",
          "transition-all duration-150",
          isOpen
            ? "bg-indigo-50/80 dark:bg-indigo-500/10"
            : "bg-neutral-50 hover:bg-neutral-100/80 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/60"
        )}>
          {/* Expand toggle */}
          <button
            onClick={() => toggleArcen(arcen.id)}
            aria-expanded={isOpen}
            className="flex items-center gap-3 flex-1 min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded"
          >
            <ChevronRight
              size={14}
              className={cn(
                "shrink-0 text-neutral-400 dark:text-neutral-600 transition-transform duration-200",
                isOpen && "rotate-90 text-indigo-500 dark:text-indigo-400"
              )}
            />

            <span className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              isOpen
                ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
            )}>
              <Shield size={13} strokeWidth={1.8} />
            </span>

            <div className="flex flex-1 flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "text-[13px] font-bold",
                  isOpen ? "text-indigo-700 dark:text-indigo-300" : "text-neutral-700 dark:text-neutral-300"
                )}>
                  {arcen.name}
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-500 font-medium">
                  {arcen.fullName}
                </span>
                <span className="rounded bg-neutral-200 dark:bg-neutral-800 px-1.5 py-0.5 font-mono text-[9px] text-neutral-500">
                  {arcen.code}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-600">
                  <MapPin size={9} /> {arcen.location}
                </span>
              </div>
            </div>
          </button>

          {/* Right side: stats + members button */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                <Users size={11} /> {arcen.reservists.toLocaleString()}
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-600">
                {arcen.groups.length} groups · {totalSquadrons} squadrons
              </span>
            </div>

            {/* View Members button */}
            <button
              onClick={(e) => { e.stopPropagation(); setModal(true); }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium",
                "border-indigo-200 dark:border-indigo-500/30",
                "bg-indigo-50 dark:bg-indigo-500/10",
                "text-indigo-600 dark:text-indigo-400",
                "hover:bg-indigo-100 dark:hover:bg-indigo-500/20",
                "transition-all duration-150"
              )}
            >
              <Users size={11} />
              Members
            </button>
          </div>
        </div>

        {/* ── Groups ──────────────────────────────────────────── */}
        <div className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="border-t border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5 px-4 py-3">
            <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-indigo-400 dark:text-indigo-600">
              <span className="inline-block h-px w-3 bg-indigo-300 dark:bg-indigo-700" />
              Groups ({arcen.groups.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {arcen.groups.map((group) => (
                <GroupAccordion key={group.id} group={group} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Members Modal */}
      <MembersModal
        open={modal}
        node={arcen}
        nodeType="arcen"
        onClose={() => setModal(false)}
      />
    </>
  );
}