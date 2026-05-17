import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import { RANKS, SPECIALIZATIONS, CIVIL_OCCUPATIONS } from "@/data/reservistsData";
import { useState, useEffect, useMemo } from "react";
import { getSquadrons, getArcens, getGroupsList } from "@/services/api";
import { Plus, X } from "lucide-react";

const SECTION_TITLE_CLASS = "text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 pt-1 pb-0.5 border-b border-neutral-100 dark:border-neutral-800 mb-1";

function DynamicList({ label, items, onChange, placeholder }) {
  const addItem = () => onChange([...items, ""]);
  const updateItem = (idx, val) => {
    const newItems = [...items];
    newItems[idx] = val;
    onChange(newItems);
  };
  const removeItem = (idx) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">{label}</span>
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-1">
          <FormInput value={item} onChange={(v) => updateItem(idx, v)} placeholder={placeholder} />
          <button
            type="button"
            onClick={() => removeItem(idx)}
            className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-1 text-neutral-400 hover:text-red-500 hover:border-red-300 transition-colors"
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium mt-0.5"
      >
        <Plus size={11} /> Add {label}
      </button>
    </div>
  );
}

export default function ReservistModal({ open, mode, form, onChange, onClose, onSubmit }) {
  const [squadronOptions, setSquadronOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [arcenOptions, setArcenOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (key) => (val) => onChange({ ...form, [key]: val });

  // Filter groups based on selected ARSEN
  const filteredGroupOptions = useMemo(() => {
    if (!groupOptions.length || !form.reserveCenter) return [];
    const selectedArsen = parseInt(form.reserveCenter, 10);
    return groupOptions.filter(g => {
      const arsenId = g.arsen_id != null ? parseInt(g.arsen_id, 10) : null;
      return arsenId === selectedArsen;
    });
  }, [form.reserveCenter, groupOptions]);

  // Filter squadrons based on selected Group
  const filteredSquadronOptions = useMemo(() => {
    if (!squadronOptions.length || !form.groupCommand) return [];
    const selectedGroup = parseInt(form.groupCommand, 10);
    return squadronOptions.filter(sq => {
      const groupId = sq.groupId != null ? parseInt(sq.groupId, 10) : null;
      return groupId === selectedGroup;
    });
  }, [form.groupCommand, squadronOptions]);

  useEffect(() => {
    if (open) {
      setLoading(true);
      Promise.all([
        getSquadrons(),
        getGroupsList(),
        getArcens()
      ])
        .then(([sqRes, grRes, arRes]) => {
          if (sqRes.data.status === 'success') {
            setSquadronOptions(sqRes.data.data.map(sq => ({
              value: sq.id,
              label: `${sq.name} — ${sq.group_name}`,
              groupId: sq.group_id,
            })));
          }
          if (grRes.data.status === 'success') {
            setGroupOptions(grRes.data.data.map(g => ({
              value: g.id,
              label: g.name,
              arsen_id: g.arsen_id,
            })));
          }
          if (arRes.data.status === 'success') {
            setArcenOptions(arRes.data.data.map(a => ({
              value: a.id,
              label: a.name,
            })));
          }
        })
        .catch(err => console.error('Failed to load options:', err))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const handleSquadronChange = (val) => {
    onChange({
      ...form,
      squadron: val,
    });
  };

  const handleArcenChange = (val) => {
    onChange({
      ...form,
      reserveCenter: val,
      groupCommand: '', // Reset group when ARCEN changes
      squadron: '', // Reset squadron when ARCEN changes
    });
  };

  const handleGroupChange = (val) => {
    onChange({
      ...form,
      groupCommand: val,
      squadron: '', // Reset squadron when group changes
    });
  };

  const updateArray = (key) => (items) => onChange({ ...form, [key]: items });

  return (
    <AddEditModal
      open={open}
      title={mode === "add" ? "Add New Reservist" : "Edit Reservist"}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={mode === "add" ? "Add Reservist" : "Save Changes"}
      maxWidth="max-w-[95vw]"
    >
      {mode === "add" && (
        <div className="grid grid-cols-2 gap-2">
          <FormField label="Email" required>
            <FormInput type="email" value={form.email} onChange={set("email")} placeholder="juan@example.com" />
          </FormField>
          <FormField label="Password" required>
            <FormInput type="password" value={form.password} onChange={set("password")} placeholder="Minimum 6 characters" />
          </FormField>
        </div>
      )}

      <div className={SECTION_TITLE_CLASS}>PERSONAL INFORMATION</div>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="First Name" required>
          <FormInput value={form.firstName} onChange={set("firstName")} placeholder="Juan" />
        </FormField>
        <FormField label="Last Name" required>
          <FormInput value={form.lastName} onChange={set("lastName")} placeholder="Dela Cruz" />
        </FormField>
        <FormField label="Rank" required>
          <FormSelect value={form.rank} onChange={set("rank")}>
            <option value="">Select Rank…</option>
            {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
          </FormSelect>
        </FormField>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="AFPSN (Serial Number)" required>
          <FormInput value={form.serialNo} onChange={set("serialNo")} placeholder="PAF-001-2024" />
        </FormField>
        <FormField label="Date of Birth">
          <FormInput type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
        </FormField>
        <FormField label="Place of Birth">
          <FormInput value={form.placeOfBirth} onChange={set("placeOfBirth")} placeholder="City, Province" />
        </FormField>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <FormField label="Age">
          <FormInput type="number" value={form.age} onChange={set("age")} placeholder="30" />
        </FormField>
        <FormField label="Sex">
          <FormSelect value={form.sex} onChange={set("sex")}>
            <option value="">Select…</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </FormSelect>
        </FormField>
        <FormField label="Civil Status">
          <FormSelect value={form.civilStatus} onChange={set("civilStatus")}>
            <option value="">Select…</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
          </FormSelect>
        </FormField>
        <FormField label="Citizenship">
          <FormInput value={form.citizenship} onChange={set("citizenship")} placeholder="Filipino" />
        </FormField>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <FormField label="Height (cm)">
          <FormInput type="number" value={form.height} onChange={set("height")} placeholder="170" />
        </FormField>
        <FormField label="Weight (kg)">
          <FormInput type="number" value={form.weight} onChange={set("weight")} placeholder="65" />
        </FormField>
        <FormField label="Blood Type">
          <FormSelect value={form.bloodType} onChange={set("bloodType")}>
            <option value="">Select…</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </FormSelect>
        </FormField>
        <FormField label="Home Address">
          <FormInput value={form.homeAddress} onChange={set("homeAddress")} placeholder="Street, City, Province" />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Contact Number">
          <FormInput value={form.contact} onChange={set("contact")} placeholder="09XXXXXXXXX" />
        </FormField>
        <FormField label="Email Address">
          <FormInput type="email" value={form.emailAddress} onChange={set("emailAddress")} placeholder="email@example.com" />
        </FormField>
      </div>

      <div className={SECTION_TITLE_CLASS}>MILITARY INFORMATION</div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Branch of Service">
          <FormInput value="Philippine Air Force (Reserve)" readOnly className="bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed" />
        </FormField>
<FormField label="Reserve Center">
           <FormSelect value={form.reserveCenter} onChange={handleArcenChange} disabled={loading}>
             <option value="">{loading ? "Loading..." : "Select Reserve Center…"}</option>
             {arcenOptions.map((o) => (
               <option key={o.value} value={o.value}>{o.label}</option>
             ))}
           </FormSelect>
         </FormField>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Group Command">
          <FormSelect value={form.groupCommand} onChange={handleGroupChange} disabled={loading || !form.reserveCenter}>
            <option value="">{loading ? "Loading..." : "Select Group…"}</option>
            {filteredGroupOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Squadron" required>
          <FormSelect value={form.squadron} onChange={handleSquadronChange} disabled={loading || !form.groupCommand}>
            <option value="">{loading ? "Loading squadrons..." : "Select Squadron…"}</option>
            {filteredSquadronOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Category">
          <FormSelect value={form.category} onChange={set("category")}>
            <option value="">Select…</option>
            <option value="1st Category">1st Category</option>
            <option value="2nd Category">2nd Category</option>
            <option value="3rd Category">3rd Category</option>
          </FormSelect>
        </FormField>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Date Enlisted">
          <FormInput type="date" value={form.dateEnlisted} onChange={set("dateEnlisted")} />
        </FormField>
        <FormField label="Rank Date of Appointment">
          <FormInput type="date" value={form.rankDateOfAppointment} onChange={set("rankDateOfAppointment")} />
        </FormField>
        <FormField label="Specialization/MOS">
          <FormSelect value={form.specialization} onChange={set("specialization")}>
            <option value="">Select…</option>
            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
        </FormField>
      </div>
      <FormField label="Source of Commission/Enlistment">
        <div className="flex gap-4">
          {["ROTC", "BCMT", "MOTC", "Direct Commission"].map((source) => (
            <label key={source} className="flex items-center gap-1 text-[12px] text-neutral-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={form.sourceOfCommission?.includes(source) || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const current = form.sourceOfCommission || [];
                  const newValue = checked
                    ? [...current, source]
                    : current.filter(s => s !== source);
                  onChange({ ...form, sourceOfCommission: newValue });
                }}
                className="rounded border-neutral-300 dark:border-neutral-600"
              />
              {source}
            </label>
          ))}
        </div>
      </FormField>
      <FormField label="Reserve Status">
        <div className="flex gap-4">
          {["Ready Reserve", "Standby Reserve", "Retired"].map((status) => (
            <label key={status} className="flex items-center gap-1 text-[12px] text-neutral-600 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={form.reserveStatus?.includes(status) || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const current = form.reserveStatus || [];
                  const newValue = checked
                    ? [...current, status]
                    : current.filter(s => s !== status);
                  onChange({ ...form, reserveStatus: newValue });
                }}
                className="rounded border-neutral-300 dark:border-neutral-600"
              />
              {status}
            </label>
          ))}
        </div>
      </FormField>

      <div className={SECTION_TITLE_CLASS}>EDUCATIONAL BACKGROUND</div>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Highest Educational Attainment">
          <FormInput value={form.highestEducation} onChange={set("highestEducation")} placeholder="College Graduate" />
        </FormField>
        <FormField label="Course/Degree">
          <FormInput value={form.courseDegree} onChange={set("courseDegree")} placeholder="Bachelor of Science" />
        </FormField>
        <FormField label="School">
          <FormInput value={form.school} onChange={set("school")} placeholder="University Name" />
        </FormField>
      </div>
      <FormField label="Year Graduated">
        <FormInput type="number" value={form.yearGraduated} onChange={set("yearGraduated")} placeholder="2020" className="max-w-[120px]" />
      </FormField>

      <div className={SECTION_TITLE_CLASS}>CIVILIAN INFORMATION</div>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Occupation">
          <FormSelect value={form.civilOccupation} onChange={set("civilOccupation")}>
            <option value="">Select…</option>
            {CIVIL_OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Employer/Company">
          <FormInput value={form.employerCompany} onChange={set("employerCompany")} placeholder="Company Name" />
        </FormField>
        <FormField label="Office Address">
          <FormInput value={form.officeAddress} onChange={set("officeAddress")} placeholder="Office Address" />
        </FormField>
      </div>

      <div className={SECTION_TITLE_CLASS}>MILITARY TRAINING</div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Basic Training Completed">
          <FormSelect value={form.basicTraining} onChange={set("basicTraining")}>
            <option value="">Select…</option>
            <option value="BCMT">BCMT</option>
            <option value="ROTC">ROTC</option>
            <option value="MOTC">MOTC</option>
          </FormSelect>
        </FormField>
        <FormField label="Date Completed">
          <FormInput type="date" value={form.basicTrainingDateCompleted} onChange={set("basicTrainingDateCompleted")} />
        </FormField>
      </div>
      <DynamicList
        label="Other Military Courses/Training"
        items={form.militaryCourses || []}
        onChange={updateArray("militaryCourses")}
        placeholder="Enter military course/training"
      />

      <div className={SECTION_TITLE_CLASS}>AWARDS AND DECORATIONS</div>
      <DynamicList
        label="Awards and Decorations"
        items={form.awardsDecorations || []}
        onChange={updateArray("awardsDecorations")}
        placeholder="Enter award/decoration"
      />

      <div className={SECTION_TITLE_CLASS}>EMERGENCY CONTACT</div>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Name">
          <FormInput value={form.emergencyContactName} onChange={set("emergencyContactName")} placeholder="Full Name" />
        </FormField>
        <FormField label="Relationship">
          <FormInput value={form.emergencyContactRelationship} onChange={set("emergencyContactRelationship")} placeholder="Spouse, Parent, etc." />
        </FormField>
        <FormField label="Contact Number">
          <FormInput value={form.emergencyContactNumber} onChange={set("emergencyContactNumber")} placeholder="09XXXXXXXXX" />
        </FormField>
      </div>
      <FormField label="Address">
        <FormInput value={form.emergencyContactAddress} onChange={set("emergencyContactAddress")} placeholder="Address" />
      </FormField>
    </AddEditModal>
  );
}