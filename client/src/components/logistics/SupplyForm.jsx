import { useState, useEffect } from "react";
import AddEditModal, { FormField, FormInput, FormSelect } from "@/components/airbase/AddEditModal";

const SUPPLY_CATEGORIES = [
  "Uniforms", "Shoes", "Badges", "Weapons", "Ammunition",
  "Protective Equipment", "Communications", "Medical", "Field Equipment",
  "Rations", "Optics", "Training Aids", "Logistics", "Other",
];

const UNITS = [
  "pcs", "pairs", "sets", "boxes", "rolls", "liters",
  "kg", "meters", "reams", "packs", "units", "bundles",
];

export default function SupplyForm({ open, onClose, onSubmit, initialData = null, loading = false }) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    unit: "pcs",
    quantity_available: 0,
    reorder_level: 10,
    max_stock: "",
    location: "",
    supplier: "",
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          name: initialData.name || "",
          category: initialData.category || "",
          description: initialData.description || "",
          unit: initialData.unit || "pcs",
          quantity_available: initialData.quantity_available ?? 0,
          reorder_level: initialData.reorder_level ?? 10,
          max_stock: initialData.max_stock ?? "",
          location: initialData.location || "",
          supplier: initialData.supplier || "",
        });
      } else {
        setForm({
          name: "",
          category: "",
          description: "",
          unit: "pcs",
          quantity_available: 0,
          reorder_level: 10,
          max_stock: "",
          location: "",
          supplier: "",
        });
      }
    }
  }, [open, initialData]);

  const handleSubmit = () => {
    if (!form.name.trim() || !form.category || !form.unit) return;
    const data = {
      ...form,
      quantity_available: parseInt(form.quantity_available) || 0,
      reorder_level: parseInt(form.reorder_level) || 0,
      max_stock: form.max_stock ? parseInt(form.max_stock) : null,
    };
    onSubmit(data);
  };

  const isEdit = !!initialData;

  return (
    <AddEditModal
      open={open}
      title={isEdit ? "Edit Supply Item" : "Add New Supply Item"}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Save Changes" : "Add Item"}
      maxWidth="max-w-xl"
    >
      <FormField label="Item Name" required>
        <FormInput
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="e.g. Combat Boots, Service Uniform"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Category" required>
          <FormSelect
            value={form.category}
            onChange={(v) => setForm((f) => ({ ...f, category: v }))}
          >
            <option value="">Select category…</option>
            {SUPPLY_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </FormSelect>
        </FormField>
        <FormField label="Unit" required>
          <FormSelect
            value={form.unit}
            onChange={(v) => setForm((f) => ({ ...f, unit: v }))}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </FormSelect>
        </FormField>
      </div>
      <FormField label="Description">
        <FormInput
          value={form.description}
          onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          placeholder="Brief description of the item"
        />
      </FormField>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Quantity Available">
          <FormInput
            type="number"
            min="0"
            value={form.quantity_available}
            onChange={(v) => setForm((f) => ({ ...f, quantity_available: v }))}
          />
        </FormField>
        <FormField label="Reorder Level">
          <FormInput
            type="number"
            min="0"
            value={form.reorder_level}
            onChange={(v) => setForm((f) => ({ ...f, reorder_level: v }))}
          />
        </FormField>
        <FormField label="Max Stock">
          <FormInput
            type="number"
            min="0"
            value={form.max_stock}
            onChange={(v) => setForm((f) => ({ ...f, max_stock: v }))}
            placeholder="Optional"
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Storage Location">
          <FormInput
            value={form.location}
            onChange={(v) => setForm((f) => ({ ...f, location: v }))}
            placeholder="e.g. Warehouse A, Shelf 3"
          />
        </FormField>
        <FormField label="Supplier">
          <FormInput
            value={form.supplier}
            onChange={(v) => setForm((f) => ({ ...f, supplier: v }))}
            placeholder="Supplier name"
          />
        </FormField>
      </div>
    </AddEditModal>
  );
}
