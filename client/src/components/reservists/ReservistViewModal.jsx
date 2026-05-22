import { useEffect, useRef } from "react";
import {
  X, User, Shield, MapPin, Phone, Briefcase,
  BookOpen, Calendar, Award, Heart, GraduationCap, Pencil, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/airbase/AirbaseUI";

function ScoreCard({ label, value, color }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 gap-1">
      <span className={cn("text-2xl font-black leading-none", color)}>{value}</span>
      <span className="text-[10px] text-neutral-400 dark:text-neutral-600 text-center leading-tight">{label}</span>
    </div>
  );
}

function DetailSection({ icon: Icon, title, children }) {
  const childArr = Array.isArray(children) ? children : [children];
  const hasContent = childArr.some((c) => c != null && c !== false);
  if (!hasContent) return null;
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="bg-neutral-50 dark:bg-neutral-800/50 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
        <Icon size={12} className="text-neutral-400 dark:text-neutral-500" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
          {title}
        </p>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

function DetailField({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 w-40 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-[13px] font-medium text-neutral-800 dark:text-neutral-200 leading-snug">
        {Array.isArray(value) ? value.join(", ") : value}
      </span>
    </div>
  );
}

export default function ReservistViewModal({ reservist, onClose, onEdit }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!reservist) return;
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [reservist, onClose]);

  useEffect(() => {
    document.body.style.overflow = reservist ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [reservist]);

  if (!reservist) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

      <div className={cn(
        "relative z-10 w-full max-w-3xl rounded-2xl shadow-2xl",
        "bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-800",
        "animate-in fade-in zoom-in-95 duration-150",
        "flex flex-col max-h-[90vh]",
        "mx-2 sm:mx-4"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-sm">
              {reservist.firstName?.[0]}{reservist.lastName?.[0]}
            </span>
            <div>
              <p className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50 leading-tight">
                {reservist.firstName} {reservist.lastName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-neutral-500 dark:text-neutral-500 font-mono">
                  {reservist.serialNo}
                </span>
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
                <StatusBadge status={reservist.status} />
                <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                  {reservist.rank}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Detail sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailSection icon={Shield} title="Assignment">
              <DetailField label="Squadron" value={reservist.squadron} />
              <DetailField label="Group" value={reservist.group} />
              <DetailField label="ARCEN" value={reservist.arcen} />
              <DetailField label="Airbase / Location" value={reservist.airbase} />
            </DetailSection>

            <DetailSection icon={User} title="Personal Information">
              <DetailField label="Date of Birth" value={reservist.dateOfBirth} />
              <DetailField label="Place of Birth" value={reservist.placeOfBirth} />
              <DetailField label="Age" value={reservist.age} />
              <DetailField label="Sex" value={reservist.sex} />
              <DetailField label="Civil Status" value={reservist.civilStatus} />
              <DetailField label="Citizenship" value={reservist.citizenship} />
              <DetailField label="Height (cm)" value={reservist.height} />
              <DetailField label="Weight (kg)" value={reservist.weight} />
              <DetailField label="Blood Type" value={reservist.bloodType} />
            </DetailSection>

            <DetailSection icon={Shield} title="Military Information">
              <DetailField label="Position" value={reservist.position} />
              <DetailField label="Reserve Center" value={reservist.reserveCenter} />
              <DetailField label="Category" value={reservist.category} />
              <DetailField label="Reserve Status" value={reservist.reserveStatus} />
              <DetailField label="Source of Commission" value={reservist.sourceOfCommission} />
              <DetailField label="Date Enlisted" value={reservist.dateEnlisted} />
              <DetailField label="Rank Date of Appointment" value={reservist.rankDateOfAppointment} />
              <DetailField label="Specialization" value={reservist.specialization} />
            </DetailSection>

            <DetailSection icon={GraduationCap} title="Educational Background">
              <DetailField label="Highest Education" value={reservist.highestEducation} />
              <DetailField label="Course / Degree" value={reservist.courseDegree} />
              <DetailField label="School" value={reservist.school} />
              <DetailField label="Year Graduated" value={reservist.yearGraduated} />
            </DetailSection>

            <DetailSection icon={Briefcase} title="Civilian Information">
              <DetailField label="Occupation" value={reservist.civilOccupation} />
              <DetailField label="Employer / Company" value={reservist.employerCompany} />
              <DetailField label="Office Address" value={reservist.officeAddress} />
            </DetailSection>

            <DetailSection icon={BookOpen} title="Military Training">
              <DetailField label="Basic Training" value={reservist.basicTraining} />
              <DetailField label="Date Completed" value={reservist.basicTrainingDateCompleted} />
            </DetailSection>

            <DetailSection icon={Phone} title="Contact">
              <DetailField label="Contact No." value={reservist.contact} />
              <DetailField label="Address" value={reservist.address} />
              <DetailField label="Email" value={reservist.email} />
            </DetailSection>

            <DetailSection icon={Heart} title="Emergency Contact">
              <DetailField label="Name" value={reservist.emergencyContactName} />
              <DetailField label="Contact No." value={reservist.emergencyContactNumber} />
              <DetailField label="Address" value={reservist.emergencyContactAddress} />
            </DetailSection>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium",
              "border-neutral-200 dark:border-neutral-700",
              "text-neutral-600 dark:text-neutral-400",
              "hover:bg-neutral-50 dark:hover:bg-neutral-800",
              "transition-colors duration-150"
            )}
          >
            Close
          </button>
          <button
            onClick={() => onEdit(reservist)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold",
              "bg-indigo-600 text-white",
              "hover:bg-indigo-700 active:bg-indigo-800",
              "shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30",
              "transition-all duration-150",
              "flex items-center gap-1.5"
            )}
          >
            <Pencil size={13} />
            Edit Reservist
          </button>
        </div>
      </div>
    </div>
  );
}
