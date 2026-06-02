import { useState, useEffect } from "react";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import { getReservists, getSquadrons, getGroupsList } from "@/services/api";

export default function BulkIssueForm({ open, onClose, onSubmit, supplies = [], loading = false }) {
  const [reservists, setReservists] = useState([]);
  const [squadrons, setSquadrons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedReservists, setSelectedReservists] = useState([]);
  const [form, setForm] = useState({
    supply_id: "",
    quantity_issued: "",
    due_return_date: "",
    issuance_type: "issued",
    condition_on_issue: "good",
    notes: "",
    assign_to: "individual",
    squadron_id: "",
    group_id: "",
  });

  useEffect(() => {
    if (open) {
      fetchData();
      setForm(f => ({ ...f, quantity_issued: "", due_return_date: "", notes: "" }));
      setSelectedReservists([]);
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [reservistsRes, squadronsRes, groupsRes] = await Promise.all([
        getReservists({ limit: 1000 }),
        getSquadrons(),
        getGroupsList(),
      ]);
      const reservistList = reservistsRes.data.data.reservists || reservistsRes.data.data || [];
      setReservists(reservistList);
      setSquadrons(squadronsRes.data?.data || squadronsRes.data || []);
      setGroups(groupsRes.data?.data || groupsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedReservists(reservists.map(r => r.id));
    } else {
      setSelectedReservists([]);
    }
  };

  const handleReservistToggle = (id) => {
    setSelectedReservists(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const getFilteredReservists = () => {
    let filtered = reservists;
    if (form.assign_to === "squadron" && form.squadron_id) {
      filtered = filtered.filter(r => String(r.squadron_id) === String(form.squadron_id));
    } else if (form.assign_to === "group" && form.group_id) {
      filtered = filtered.filter(r => String(r.group_id) === String(form.group_id));
    } else if (form.assign_to === "individual") {
      filtered = reservists.filter(r => selectedReservists.includes(r.id));
    }
    return filtered;
  };

  const handleSubmit = () => {
    if (!form.supply_id || !form.quantity_issued || !form.due_return_date) return;
    
    const targetReservists = getFilteredReservists();
    if (targetReservists.length === 0) return;

    onSubmit({
      ...form,
      reservist_ids: targetReservists.map(r => r.id),
      quantity_per_reservist: parseInt(form.quantity_issued),
      supply_id: parseInt(form.supply_id),
      quantity_issued: parseInt(form.quantity_issued) * targetReservists.length,
    });
  };

  const selectedSupply = supplies.find(s => String(s.id) === String(form.supply_id));
  const filteredReservists = getFilteredReservists();

  return (
    <AddEditModal
      open={open}
      title="Bulk Issue Uniforms"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Issue to All"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <FormField label="Supply Item" required>
          <FormSelect
            value={form.supply_id}
            onChange={(v) => setForm(f => ({ ...f, supply_id: v }))}
          >
            <option value="">Select uniform item…</option>
            {supplies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.category}) — {s.quantity_available} {s.unit} available
              </option>
            ))}
          </FormSelect>
        </FormField>

        {selectedSupply && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-9500/20 p-2">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Available: <span className="font-semibold">{selectedSupply.quantity_available} {selectedSupply.unit}</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <FormField label="Quantity per Reservist" required>
            <FormInput
              type="number"
              min="1"
              value={form.quantity_issued}
              onChange={(v) => setForm(f => ({ ...f, quantity_issued: v }))}
              placeholder="e.g. 1"
            />
          </FormField>
          <FormField label="Due Return Date" required>
            <FormInput
              type="date"
              value={form.due_return_date}
              onChange={(v) => setForm(f => ({ ...f, due_return_date: v }))}
            />
          </FormField>
        </div>

        <FormField label="Issuance Type">
          <FormSelect
            value={form.issuance_type}
            onChange={(v) => setForm(f => ({ ...f, issuance_type: v }))}
          >
            <option value="issued">Issued (Organization-supplied)</option>
            <option value="personal">Personal (Reservist-bought)</option>
          </FormSelect>
        </FormField>

        <FormField label="Assign To">
          <FormSelect
            value={form.assign_to}
            onChange={(v) => setForm(f => ({ ...f, assign_to: v, squadron_id: "", group_id: "" }))}
          >
            <option value="individual">Individual Reservists</option>
            <option value="squadron">Entire Squadron</option>
            <option value="group">Entire Group</option>
          </FormSelect>
        </FormField>

        {form.assign_to === "squadron" && (
          <FormField label="Select Squadron">
            <FormSelect
              value={form.squadron_id}
              onChange={(v) => setForm(f => ({ ...f, squadron_id: v }))}
            >
              <option value="">Select squadron…</option>
              {squadrons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </FormSelect>
          </FormField>
        )}

        {form.assign_to === "group" && (
          <FormField label="Select Group">
            <FormSelect
              value={form.group_id}
              onChange={(v) => setForm(f => ({ ...f, group_id: v }))}
            >
              <option value="">Select group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </FormSelect>
          </FormField>
        )}

        {form.assign_to === "individual" && (
          <div className="max-h-60 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <div className="p-2 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 bg-white dark:bg-neutral-900">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedReservists.length === reservists.length && reservists.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-neutral-300"
                />
                Select All ({reservists.length})
              </label>
            </div>
            <div className="p-2 space-y-1">
              {reservists.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={selectedReservists.includes(r.id)}
                    onChange={() => handleReservistToggle(r.id)}
                    className="rounded border-neutral-300"
                  />
                  <span>
                    {r.last_name}, {r.first_name} — {r.rank} ({r.service_number})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-neutral-400 dark:text-neutral-600">
          Total reservists: <span className="font-semibold">{filteredReservists.length}</span>
          {selectedSupply && filteredReservists.length > 0 && (
            <> | Total items needed: <span className="font-semibold text-indigo-600">{parseInt(form.quantity_issued || 0) * filteredReservists.length}</span></>
          )}
        </p>

        <FormField label="Notes">
          <FormInput
            value={form.notes}
            onChange={(v) => setForm(f => ({ ...f, notes: v }))}
            placeholder="Optional notes for this issuance"
          />
        </FormField>
      </div>
    </AddEditModal>
  );
}