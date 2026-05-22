import { useState, useEffect } from "react";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";
import { getReservists } from "@/services/api";

export default function IssueForm({ open, onClose, onSubmit, supplies = [], loading = false }) {
  const [reservists, setReservists] = useState([]);
  const [form, setForm] = useState({
    reservist_id: "",
    supply_id: "",
    quantity_issued: "",
    due_return_date: "",
    condition_on_issue: "good",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchReservists();
      setForm({
        reservist_id: "",
        supply_id: "",
        quantity_issued: "",
        due_return_date: "",
        condition_on_issue: "good",
        notes: "",
      });
    }
  }, [open]);

  const fetchReservists = async () => {
    try {
      const response = await getReservists({ limit: 500 });
      if (response.data.status === "success") {
        const list = response.data.data.reservists || response.data.data || [];
        setReservists(list);
      }
    } catch (err) {
      console.error("Failed to fetch reservists:", err);
    }
  };

  const handleSubmit = () => {
    if (!form.reservist_id || !form.supply_id || !form.quantity_issued || !form.due_return_date) return;
    onSubmit({
      ...form,
      reservist_id: parseInt(form.reservist_id),
      supply_id: parseInt(form.supply_id),
      quantity_issued: parseInt(form.quantity_issued),
    });
  };

  const selectedSupply = supplies.find((s) => String(s.id) === String(form.supply_id));

  return (
    <AddEditModal
      open={open}
      title="Issue Supplies"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Issue Items"
      maxWidth="max-w-xl"
    >
      <FormField label="Reservist" required>
        <FormSelect
          value={form.reservist_id}
          onChange={(v) => setForm((f) => ({ ...f, reservist_id: v }))}
        >
          <option value="">Select reservist…</option>
          {reservists.map((r) => (
            <option key={r.id} value={r.id}>
              {r.last_name}, {r.first_name} — {r.rank} ({r.service_number})
            </option>
          ))}
        </FormSelect>
      </FormField>
      <FormField label="Supply Item" required>
        <FormSelect
          value={form.supply_id}
          onChange={(v) => setForm((f) => ({ ...f, supply_id: v }))}
        >
          <option value="">Select item…</option>
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
        <FormField label="Quantity" required>
          <FormInput
            type="number"
            min="1"
            value={form.quantity_issued}
            onChange={(v) => setForm((f) => ({ ...f, quantity_issued: v }))}
            placeholder="e.g. 2"
          />
        </FormField>
        <FormField label="Due Return Date" required>
          <FormInput
            type="date"
            value={form.due_return_date}
            onChange={(v) => setForm((f) => ({ ...f, due_return_date: v }))}
          />
        </FormField>
      </div>
      <FormField label="Condition on Issue">
        <FormSelect
          value={form.condition_on_issue}
          onChange={(v) => setForm((f) => ({ ...f, condition_on_issue: v }))}
        >
          <option value="new">New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
        </FormSelect>
      </FormField>
      <FormField label="Notes">
        <FormInput
          value={form.notes}
          onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
          placeholder="Optional notes"
        />
      </FormField>
    </AddEditModal>
  );
}
