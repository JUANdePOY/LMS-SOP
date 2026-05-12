import { X, User, Shield, MapPin, Phone, Briefcase, Activity, BookOpen, Calendar } from "lucide-react";
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
 * ReservistDetailPanel
 * Right-side slide panel showing full reservist profile.
 */
export default function ReservistDetailPanel({ reservist, onClose }) {
  if (!reservist) return null;

  const readinessScore = reservist.readinessScore || 0;
  const attendanceRate = reservist.attendanceRate || 0;

  const readinessColor =
    readinessScore >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    readinessScore >= 60 ? "text-amber-600 dark:text-amber-400"     :
    "text-red-500 dark:text-red-400";

  const attendanceColor =
    attendanceRate >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    attendanceRate >= 60 ? "text-amber-600 dark:text-amber-400"     :
    "text-red-500 dark:text-red-400";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        "fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm",
        "flex flex-col",
        "bg-white dark:bg-neutral-900",
        "border-l border-neutral-200 dark:border-neutral-800",
        "shadow-2xl shadow-black/10 dark:shadow-black/40",
        "animate-in slide-in-from-right duration-200"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar */}
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
              value={`${readinessScore}%`}
              color={readinessColor}
            />
            <ScoreBadge
              label="Attendance Rate"
              value={`${attendanceRate}%`}
              color={attendanceColor}
            />
            <ScoreBadge
              label="Trainings Done"
              value={reservist.trainingsCompleted || 0}
              color="text-neutral-800 dark:text-neutral-200"
            />
          </div>

          {/* Details */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                Assignment
              </p>
            </div>
            <div className="px-3">
              <DetailRow icon={Shield}   label="Squadron"    value={reservist.squadron} />
              <DetailRow icon={User}     label="Group"       value={reservist.group}    />
              <DetailRow icon={Shield}   label="ARCEN"       value={reservist.arcen}    />
              <DetailRow icon={MapPin}   label="Airbase"     value={reservist.airbase}  />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-4">
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
        <div className="flex gap-2 border-t border-neutral-100 dark:border-neutral-800 px-5 py-4 shrink-0">
          <button
            onClick={onClose}
            className={cn(
              "flex-1 rounded-lg border py-2 text-sm font-medium",
              "border-neutral-200 dark:border-neutral-700",
              "text-neutral-600 dark:text-neutral-400",
              "hover:bg-neutral-50 dark:hover:bg-neutral-800",
              "transition-colors duration-150"
            )}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
