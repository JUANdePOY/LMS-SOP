import { useState } from "react";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";

export default function ReturnForm({ open, onClose, onSubmit, issuance = null, loading = false }) {
  const [form, setForm] = useState({
    returned_quantity: "",
    condition_on_return: "good",
    notes: "",
  });

  const handleClose = () => {
    setForm({ returned_quantity: "", condition_on_return: "good", notes: "" });
    onClose();
  };

  const handleSubmit = () => {
    if (!form.returned_quantity) return;
    onSubmit({
      returned_quantity: parseInt(form.returned_quantity),
      condition_on_return: form.condition_on_return,
      notes: form.notes || null,
    });
  };

  if (!issuance) return null;

  return (
    <AddEditModal
      open={open}
      title="Return Items"
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel="Process Return"
      maxWidth="max-w-md"
    >
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-3 mb-2">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          {issuance.supply_name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Issued to: <span className="font-medium">{issuance.last_name}, {issuance.first_name}</span> ({issuance.rank})
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Quantity issued: <span className="font-medium">{issuance.quantity_issued} {issuance.unit}</span>
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Due date: <span className="font-medium">{issuance.due_return_date}</span>
        </p>
      </div>
      <FormField label="Returned Quantity" required>
        <FormInput
          type="number"
          min="1"
          max={issuance.quantity_issued}
          value={form.returned_quantity}
          onChange={(v) => setForm((f) => ({ ...f, returned_quantity: v }))}
          placeholder={`Max: ${issuance.quantity_issued}`}
        />
      </FormField>
      <FormField label="Condition on Return">
        <FormSelect
          value={form.condition_on_return}
          onChange={(v) => setForm((f) => ({ ...f, condition_on_return: v }))}
        >
          <option value="new">New</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
          <option value="damaged">Damaged</option>
        </FormSelect>
      </FormField>
      <FormField label="Notes">
        <FormInput
          value={form.notes}
          onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
          placeholder="Optional notes about return condition"
        />
      </FormField>
    </AddEditModal>
  );
}
