import { X, User, Shield, MapPin, Phone, Briefcase, Activity, Calendar, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/airbase/AirbaseUI";

function DetailRow({ icon: Icon, label, value, valueClass }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500 mt-0.5">
        <Icon size={13} strokeWidth={1.8} />
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
          {label}
        </span>
        <span className={cn("text-[13px] font-medium text-neutral-800 dark:text-neutral-200 leading-snug", valueClass)}>
          {value}
        </span>
      </div>
    </div>
  );
}

function ScoreBadge({ label, value, color }) {
  return (
    <div className={cn(
      "flex flex-col items-center rounded-xl border p-3 gap-1",
      "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
    )}>
      <span className={cn("text-2xl font-black leading-none", color)}>{value}</span>
      <span className="text-[10px] text-neutral-400 dark:text-neutral-600 text-center leading-tight">{label}</span>
    </div>
  );
}

/**
 * ReservistDetailPanel (now a centered modal)
 * Shows full reservist profile. Edit / Toggle / Delete actions in footer.
 */
export default function ReservistDetailPanel({ reservist, onClose, onEdit, onDelete, onToggleStatus }) {
  if (!reservist) return null;

  const readinessColor =
    reservist.readinessScore >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    reservist.readinessScore >= 60 ? "text-amber-600 dark:text-amber-400"     :
    "text-red-500 dark:text-red-400";

  const attendanceColor =
    reservist.attendanceRate >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    reservist.attendanceRate >= 60 ? "text-amber-600 dark:text-amber-400"     :
    "text-red-500 dark:text-red-400";

  const isActive = reservist.status === "active";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      )}>
        <div className={cn(
          "relative w-full max-w-lg max-h-[90vh] pointer-events-auto",
          "flex flex-col",
          "bg-white dark:bg-neutral-900",
          "rounded-2xl border border-neutral-200 dark:border-neutral-800",
          "shadow-2xl shadow-black/15 dark:shadow-black/50",
          "animate-in fade-in zoom-in-95 duration-200"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-5 py-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-sm">
                {reservist.firstName[0]}{reservist.lastName[0]}
              </span>
              <div>
                <p className="text-[14px] font-bold text-neutral-900 dark:text-neutral-50 leading-tight">
                  {reservist.firstName} {reservist.lastName}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-500 font-mono">
                  {reservist.serialNo}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-none">
            {/* Status + rank */}
            <div className="flex items-center gap-2 mb-4">
              <StatusBadge status={reservist.status} />
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                {reservist.rank}
              </span>
            </div>

            {/* Performance scores */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <ScoreBadge
                label="Readiness Score"
                value={`${reservist.readinessScore}%`}
                color={readinessColor}
              />
              <ScoreBadge
                label="Attendance Rate"
                value={`${reservist.attendanceRate}%`}
                color={attendanceColor}
              />
              <ScoreBadge
                label="Trainings Done"
                value={reservist.trainingsCompleted}
                color="text-neutral-800 dark:text-neutral-200"
              />
            </div>

            {/* Assignment */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-3">
              <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                  Assignment
                </p>
              </div>
              <div className="px-3">
                <DetailRow icon={Shield} label="Squadron" value={reservist.squadron} />
                <DetailRow icon={User}   label="Group"    value={reservist.group}    />
                <DetailRow icon={Shield} label="ARCEN"    value={reservist.arcen}    />
                <DetailRow icon={MapPin} label="Airbase"  value={reservist.airbase}  />
              </div>
            </div>

            {/* Profile */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-3">
              <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                  Profile
                </p>
              </div>
              <div className="px-3">
                <DetailRow icon={Activity}  label="Specialization"   value={reservist.specialization}  />
                <DetailRow icon={Briefcase} label="Civil Occupation" value={reservist.civilOccupation} />
                <DetailRow icon={Calendar}  label="Date Enlisted"    value={reservist.dateEnlisted}    />
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                  Contact
                </p>
              </div>
              <div className="px-3">
                <DetailRow icon={Phone}  label="Contact No." value={reservist.contact} />
                <DetailRow icon={MapPin} label="Address"     value={reservist.address} />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 border-t border-neutral-100 dark:border-neutral-800 px-5 py-4 shrink-0">
            {/* Toggle status */}
            <button
              onClick={() => onToggleStatus(reservist.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
                "transition-colors duration-150",
                isActive
                  ? "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20"
                  : "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
              )}
            >
              {isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
              {isActive ? "Set Inactive" : "Set Active"}
            </button>

            <div className="flex-1" />

            {/* Delete */}
            <button
              onClick={() => onDelete(reservist.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium",
                "border-red-200 dark:border-red-500/30",
                "bg-red-50 dark:bg-red-500/10",
                "text-red-600 dark:text-red-400",
                "hover:bg-red-100 dark:hover:bg-red-500/20",
                "transition-colors duration-150"
              )}
            >
              <Trash2 size={13} /> Delete
            </button>

            {/* Edit */}
            <button
              onClick={onEdit}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold",
                "bg-indigo-600 hover:bg-indigo-700 text-white",
                "transition-colors duration-150"
              )}
            >
              <Pencil size={13} /> Edit
            </button>
          </div>
        </div>
      </div>
    </>
  );
}