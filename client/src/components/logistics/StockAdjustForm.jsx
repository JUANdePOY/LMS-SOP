import { useState } from "react";
import AddEditModal, { FormField, FormInput } from "@/components/airbase/AddEditModal";

export default function StockAdjustForm({ open, onClose, onSubmit, supply = null, loading = false }) {
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState("");

  const handleClose = () => {
    setQuantityChange("");
    setReason("");
    onClose();
  };

  const handleSubmit = () => {
    const change = parseInt(quantityChange);
    if (!change || !reason.trim()) return;
    onSubmit({
      supply_id: supply.id,
      quantity_change: change,
      reason: reason.trim(),
    });
    handleClose();
  };

  if (!supply) return null;

  return (
    <AddEditModal
      open={open}
      title="Adjust Stock"
      onClose={handleClose}
      onSubmit={handleSubmit}
      submitLabel="Adjust Stock"
      maxWidth="max-w-md"
    >
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-3 mb-2">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{supply.name}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Current stock: <span className="font-medium text-neutral-700 dark:text-neutral-300">{supply.quantity_available} {supply.unit}</span>
          {supply.max_stock && <span className="ml-2">Max: {supply.max_stock}</span>}
        </p>
      </div>
      <FormField label="Quantity Change" required>
        <FormInput
          type="number"
          value={quantityChange}
          onChange={setQuantityChange}
          placeholder="e.g. +50 or -10"
        />
        <p className="text-[10px] text-neutral-400 mt-1">Use positive numbers to add stock, negative to remove</p>
      </FormField>
      <FormField label="Reason" required>
        <FormInput
          value={reason}
          onChange={setReason}
          placeholder="e.g. New delivery, Damaged items, Audit correction"
        />
      </FormField>
    </AddEditModal>
  );
}
