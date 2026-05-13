import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import { RANKS, SPECIALIZATIONS, CIVIL_OCCUPATIONS } from "@/data/reservistsData";
import { useState, useEffect } from "react";
import { getSquadrons, getGroupsList } from "@/services/api";

/**
 * ReservistModal
 * Add / Edit modal for a single reservist record.
 */
export default function ReservistModal({ open, mode, form, onChange, onClose, onSubmit }) {
  const [squadronOptions, setSquadronOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (key) => (val) => onChange({ ...form, [key]: val });

  // Fetch squadrons from API when modal opens in add mode
  useEffect(() => {
    if (open && mode === "add") {
      setLoading(true);
      getSquadrons()
        .then(res => {
          if (res.data.status === 'success') {
            setSquadronOptions(res.data.data.map(sq => ({
              value: sq.id,
              label: `${sq.name} — ${sq.group_name}`,
              groupId: sq.group_id,
            })));
          }
        })
        .catch(err => console.error('Failed to load squadrons:', err))
        .finally(() => setLoading(false));
    }
  }, [open, mode]);

  // Auto-fill group when squadron is selected
  const handleSquadronChange = (val) => {
    const sq = squadronOptions.find((s) => s.value === val);
    onChange({
      ...form,
      squadron: val,
      group: sq?.groupId ?? form.group,
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
      {/* Login credentials - only for add mode */}
      {mode === "add" && (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Email" required>
            <FormInput type="email" value={form.email} onChange={set("email")} placeholder="juan@example.com" />
          </FormField>
          <FormField label="Password" required>
            <FormInput type="password" value={form.password} onChange={set("password")} placeholder="Minimum 6 characters" />
          </FormField>
        </div>
      )}

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
        <FormSelect value={form.squadron} onChange={handleSquadronChange} disabled={loading}>
          <option value="">{loading ? "Loading squadrons..." : "Select Squadron…"}</option>
          {squadronOptions.map((o) => (
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
