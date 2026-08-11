import { User, Shield, Phone, MapPin, Calendar, Briefcase, Mail } from "lucide-react";

function IntroRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon size={16} className="mt-0.5 shrink-0 text-neutral-400" />
      <div>
        <p className="text-neutral-800 dark:text-neutral-200 leading-snug">{value}</p>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

export default function IntroCard({ profile = {} }) {
  const rows = [
    profile.bio ? { icon: User, label: "Bio", value: profile.bio } : null,
    { icon: Briefcase, label: "Works at", value: profile.position_title },
    { icon: Shield, label: "Employee ID", value: profile.employee_id },
    { icon: Shield, label: "Employment status", value: profile.employment_status },
    { icon: Calendar, label: "Joined", value: profile.date_hired },
    { icon: Calendar, label: "Birthdate", value: profile.birthdate },
    { icon: Phone, label: "Contact", value: profile.contact_number },
    { icon: MapPin, label: "Lives in", value: profile.address },
    { icon: Mail, label: "Email", value: profile.email },
  ].filter(Boolean);

  return (
    <div className="fb-card p-4 sm:p-5">
      <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
        Intro
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No intro details yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <IntroRow key={row.label} {...row} />
          ))}
        </div>
      )}
    </div>
  );
}
