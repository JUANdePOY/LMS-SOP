import { X, User, Shield, MapPin, Phone, Briefcase, Activity, BookOpen, Calendar, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/airbase/AirbaseUI";

function DetailRow({ icon: Icon, label, value, valueClass }) {
  if (!value && value !== 0) return null;
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

export default function ReservistDetailPanel({ reservist, onClose, onEdit }) {
  if (!reservist) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className={cn(
        "fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm",
        "flex flex-col",
        "bg-white dark:bg-neutral-900",
        "border-l border-neutral-200 dark:border-neutral-800",
        "shadow-2xl shadow-black/10 dark:shadow-black/40",
        "animate-in slide-in-from-right duration-200",
        "max-sm:max-w-none"
      )}>
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-sm">
              {reservist.firstName?.[0]}{reservist.lastName?.[0]}
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

        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-none">
          <div className="flex items-center gap-2 mb-4">
            <StatusBadge status={reservist.status} />
            <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
              {reservist.rank}
            </span>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Assignment</p>
            </div>
            <div className="px-3">
              <DetailRow icon={Shield} label="Squadron" value={reservist.squadron} />
              <DetailRow icon={User} label="Group" value={reservist.group} />
              <DetailRow icon={Shield} label="ARCEN" value={reservist.arcen} />
              <DetailRow icon={MapPin} label="Airbase" value={reservist.airbase} />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Personal</p>
            </div>
            <div className="px-3">
              <DetailRow icon={Calendar} label="Date of Birth" value={reservist.dateOfBirth} />
              <DetailRow icon={MapPin} label="Place of Birth" value={reservist.placeOfBirth} />
              <DetailRow icon={Activity} label="Age" value={reservist.age} />
              <DetailRow icon={Activity} label="Sex" value={reservist.sex} />
              <DetailRow icon={Activity} label="Civil Status" value={reservist.civilStatus} />
              <DetailRow icon={Activity} label="Blood Type" value={reservist.bloodType} />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Military</p>
            </div>
            <div className="px-3">
              <DetailRow icon={Shield} label="Position" value={reservist.position} />
              <DetailRow icon={Shield} label="Reserve Center" value={reservist.reserveCenter} />
              <DetailRow icon={Shield} label="Category" value={reservist.category} />
              <DetailRow icon={Shield} label="Reserve Status" value={reservist.reserveStatus} />
              <DetailRow icon={Shield} label="Source of Commission" value={reservist.sourceOfCommission} />
              <DetailRow icon={Calendar} label="Date Enlisted" value={reservist.dateEnlisted} />
              <DetailRow icon={Activity} label="Specialization" value={reservist.specialization} />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Education</p>
            </div>
            <div className="px-3">
              <DetailRow icon={BookOpen} label="Highest Education" value={reservist.highestEducation} />
              <DetailRow icon={BookOpen} label="Course/Degree" value={reservist.courseDegree} />
              <DetailRow icon={BookOpen} label="School" value={reservist.school} />
              <DetailRow icon={Calendar} label="Year Graduated" value={reservist.yearGraduated} />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Civilian</p>
            </div>
            <div className="px-3">
              <DetailRow icon={Briefcase} label="Occupation" value={reservist.civilOccupation} />
              <DetailRow icon={Briefcase} label="Employer" value={reservist.employerCompany} />
              <DetailRow icon={MapPin} label="Office Address" value={reservist.officeAddress} />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Training</p>
            </div>
            <div className="px-3">
              <DetailRow icon={BookOpen} label="Basic Training" value={reservist.basicTraining} />
              <DetailRow icon={Calendar} label="Date Completed" value={reservist.basicTrainingDateCompleted} />
              {(reservist.statusBcmt || reservist.statusAdt || reservist.statusVadt || reservist.statusRotc || reservist.statusOthers) && (
                <div className="flex items-start gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 mt-0.5">
                    <Shield size={13} strokeWidth={1.8} />
                  </span>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
                      Training Status
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {reservist.statusBcmt  && <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">BCMT</span>}
                      {reservist.statusAdt   && <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">ADT</span>}
                      {reservist.statusVadt  && <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">VADT</span>}
                      {reservist.statusRotc  && <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">ROTC</span>}
                      {reservist.statusOthers && (
                        <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                          Others: {reservist.statusOthers}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden mb-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Contact</p>
            </div>
            <div className="px-3">
              <DetailRow icon={Phone} label="Contact No." value={reservist.contact} />
              <DetailRow icon={MapPin} label="Address" value={reservist.address} />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">Emergency Contact</p>
            </div>
            <div className="px-3">
              <DetailRow icon={User} label="Name" value={reservist.emergencyContactName} />
              <DetailRow icon={Phone} label="Contact No." value={reservist.emergencyContactNumber} />
              <DetailRow icon={MapPin} label="Address" value={reservist.emergencyContactAddress} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-neutral-100 dark:border-neutral-800 px-5 py-4 shrink-0">
          <button
            onClick={onEdit}
            className={cn(
              "flex-1 rounded-lg border py-2 text-sm font-medium",
              "border-indigo-200 dark:border-indigo-500/30",
              "text-indigo-600 dark:text-indigo-400",
              "hover:bg-indigo-50 dark:hover:bg-indigo-500/10",
              "transition-colors duration-150"
            )}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Pencil size={13} />
              Edit
            </span>
          </button>
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