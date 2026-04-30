import { X, Users, Tag, CheckCircle2, XCircle, MapPin, Shield, Layers, PlaneTakeoff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHierarchy } from "@/context/HierarchyContext";
import { hierarchyData } from "@/data/hierarchyData";

function resolveBreadcrumb(squadronId) {
  for (const area of hierarchyData) {
    for (const arcen of area.arcens) {
      for (const group of arcen.groups) {
        const sq = group.squadrons.find((s) => s.id === squadronId);
        if (sq) return {
          airbase: area.name,
          arcen: arcen.name,
          arcenFull: arcen.fullName,
          group: group.name,
        };
      }
    }
  }
  return null;
}

export default function SelectedSquadronPanel() {
  const { selectedSquadron, selectSquadron } = useHierarchy();
  if (!selectedSquadron) return null;

  const bc = resolveBreadcrumb(selectedSquadron.id);
  const isActive = selectedSquadron.status === "active";

  return (
    <div className={cn(
      "sticky bottom-4 mx-auto max-w-3xl",
      "rounded-2xl border shadow-xl shadow-black/10 dark:shadow-black/40",
      "border-indigo-200 dark:border-indigo-500/30",
      "bg-white dark:bg-neutral-900",
      "animate-in slide-in-from-bottom-2 fade-in duration-200"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <MapPin size={13} strokeWidth={2} />
          </span>
          <div>
            <p className="text-[13px] font-bold text-neutral-900 dark:text-neutral-50 leading-none">
              {selectedSquadron.name} Squadron
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-neutral-400">{selectedSquadron.code}</p>
          </div>
        </div>
        <button
          onClick={() => selectSquadron(selectedSquadron)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Status</span>
          <span className={cn(
            "flex items-center gap-1.5 text-[12px] font-semibold",
            isActive ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"
          )}>
            {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Members</span>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">
            <Users size={12} className="text-indigo-500" /> {selectedSquadron.members}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Specialization</span>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-neutral-800 dark:text-neutral-200">
            <Tag size={12} className="text-indigo-500" /> {selectedSquadron.specialization}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">Location</span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <MapPin size={11} className="text-indigo-500 shrink-0" />
            <span className="truncate">{selectedSquadron.location}</span>
          </span>
        </div>
      </div>

      {/* Breadcrumb trail */}
      {bc && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 px-5 py-2.5 text-[10px] text-neutral-400 dark:text-neutral-600">
          <PlaneTakeoff size={9} />
          <span>{bc.airbase}</span>
          <span>›</span>
          <Shield size={9} />
          <span className="font-medium">{bc.arcen}</span>
          <span className="text-neutral-300 dark:text-neutral-700">({bc.arcenFull})</span>
          <span>›</span>
          <Layers size={9} />
          <span className="font-medium">{bc.group}</span>
          <span>›</span>
          <MapPin size={9} />
          <span className="font-semibold text-indigo-500 dark:text-indigo-400">{selectedSquadron.name}</span>
        </div>
      )}
    </div>
  );
}