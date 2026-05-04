import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import { RANKS, SPECIALIZATIONS, CIVIL_OCCUPATIONS } from "@/data/reservistsData";

// All unique airbases, arcens, groups, squadrons from hierarchy
import { hierarchyData } from "@/data/hierarchyData";

function flatOptions() {
  const squadrons = [];
  hierarchyData.forEach((area) => {
    area.arcens.forEach((arcen) => {
      arcen.groups.forEach((group) => {
        group.squadrons.forEach((sq) => {
          squadrons.push({
            value: sq.name,
            label: `${sq.name} — ${group.name}`,
            group: group.name,
            arcen: arcen.name,
            airbase: area.name,
          });
        });
      });
    });
  });
  return squadrons;
}

const SQUADRON_OPTIONS = flatOptions();

/**
 * ReservistModal
 * Add / Edit modal for a single reservist record.
 */
export default function ReservistModal({ open, mode, form, onChange, onClose, onSubmit }) {
  const set = (key) => (val) => onChange({ ...form, [key]: val });

  // Auto-fill group/arcen/airbase when squadron is selected
  const handleSquadronChange = (val) => {
    const sq = SQUADRON_OPTIONS.find((s) => s.value === val);
    onChange({
      ...form,
      squadron: val,
      group:    sq?.group   ?? form.group,
      arcen:    sq?.arcen   ?? form.arcen,
      airbase:  sq?.airbase ?? form.airbase,
    });
  };

  return (
    <AddEditModal
      open={open}
      title={mode === "add" ? "Add New Reservist" : "Edit Reservist"}
      onClose={onClose}
      onSubmit={onSubmit}
      submitLabel={mode === "add" ? "Add Reservist" : "Save Changes"}
    >
      {/* Personal info */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First Name" required>
          <FormInput value={form.firstName} onChange={set("firstName")} placeholder="Juan" />
        </FormField>
        <FormField label="Last Name" required>
          <FormInput value={form.lastName}  onChange={set("lastName")}  placeholder="Dela Cruz" />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Serial No." required>
          <FormInput value={form.serialNo} onChange={set("serialNo")} placeholder="PAF-001-2024" />
        </FormField>
        <FormField label="Date Enlisted">
          <FormInput type="date" value={form.dateEnlisted} onChange={set("dateEnlisted")} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Rank" required>
          <FormSelect value={form.rank} onChange={set("rank")}>
            <option value="">Select Rank…</option>
            {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Status">
          <FormSelect value={form.status} onChange={set("status")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="standby">Standby</option>
          </FormSelect>
        </FormField>
      </div>

      {/* Assignment */}
      <FormField label="Squadron" required>
        <FormSelect value={form.squadron} onChange={handleSquadronChange}>
          <option value="">Select Squadron…</option>
          {SQUADRON_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </FormSelect>
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Specialization">
          <FormSelect value={form.specialization} onChange={set("specialization")}>
            <option value="">Select…</option>
            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </FormSelect>
        </FormField>
        <FormField label="Civil Occupation">
          <FormSelect value={form.civilOccupation} onChange={set("civilOccupation")}>
            <option value="">Select…</option>
            {CIVIL_OCCUPATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </FormSelect>
        </FormField>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Contact No.">
          <FormInput value={form.contact} onChange={set("contact")} placeholder="09XXXXXXXXX" />
        </FormField>
        <FormField label="Address">
          <FormInput value={form.address} onChange={set("address")} placeholder="City, Province" />
        </FormField>
      </div>
    </AddEditModal>
  );
}
