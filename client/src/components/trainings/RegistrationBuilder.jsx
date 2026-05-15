import { useState } from "react";
import { useRegistrationBuilder } from "@/hooks/useRegistrationBuilder";
import RegistrationFieldEditor from "./RegistrationFieldEditor";
import RegistrationPreview from "./RegistrationPreview";
import { FIELD_TYPES } from "@/lib/registrationUtils";

// ─── Add Field Dropdown ────────────────────────────────────────────────────────
function AddFieldMenu({ onAdd, onClose }) {
  return (
    <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg shadow-neutral-900/10 dark:shadow-black/40 z-50 overflow-hidden">
      <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
        <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
          Select Field Type
        </p>
      </div>
      <div className="py-1 max-h-64 overflow-y-auto">
        {FIELD_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => { onAdd(type.value); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/70 transition-colors group"
          >
            <span className="text-[11px] font-bold font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 min-w-[26px] text-center shrink-0">
              {type.icon}
            </span>
            <span className="text-sm text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 font-medium transition-colors">
              {type.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyFieldList() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-center px-6 py-8">
      <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-neutral-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-1">No fields yet</p>
      <p className="text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed">
        Click{" "}
        <span className="text-indigo-500 dark:text-indigo-400 font-semibold">+ Add Field</span>{" "}
        to start building<br />the registration form.
      </p>
    </div>
  );
}

// ─── Main Builder ──────────────────────────────────────────────────────────────
export default function RegistrationBuilder({
  initialFields = [],
  trainingTitle = "Training Registration",
  onChange,
}) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const {
    fields, activeFieldId, setActiveFieldId,
    addField, updateField, removeField,
    toggleRequired, addOption, updateOption,
    removeOption, moveField, clearFields,
  } = useRegistrationBuilder(initialFields);

  const handleAddField = (type) => {
    addField(type);
    onChange?.(fields);
  };

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-200">Form Builder</p>
            {fields.length === 0 ? (
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">No fields configured</p>
            ) : (
              <p className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400">
                {fields.length} field{fields.length !== 1 ? "s" : ""} configured
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {fields.length > 0 && (
            <button
              type="button"
              onClick={clearFields}
              className="text-[11px] font-medium text-neutral-400 hover:text-red-500 dark:hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
            >
              Clear All
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu(v => !v)}
              className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-indigo-500/20"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Field
            </button>
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                <AddFieldMenu onAdd={handleAddField} onClose={() => setShowAddMenu(false)} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">

        {/* LEFT — Field Configuration */}
        <div className="flex flex-col min-h-0 rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-white dark:bg-neutral-900 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <div className="w-0.5 h-3.5 rounded-full bg-indigo-500" />
            <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
              Field Configuration
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {fields.length === 0 ? (
              <EmptyFieldList />
            ) : (
              fields.map((field, index) => (
                <RegistrationFieldEditor
                  key={field.id}
                  field={field}
                  index={index}
                  total={fields.length}
                  isActive={activeFieldId === field.id}
                  onActivate={() => setActiveFieldId(activeFieldId === field.id ? null : field.id)}
                  onUpdate={updateField}
                  onRemove={removeField}
                  onToggleRequired={toggleRequired}
                  onAddOption={addOption}
                  onUpdateOption={updateOption}
                  onRemoveOption={removeOption}
                  onMove={moveField}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div className="flex flex-col min-h-0 rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-white dark:bg-neutral-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-3.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                Live Preview
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Real-time
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5">
            <RegistrationPreview fields={fields} trainingTitle={trainingTitle} />
          </div>
        </div>

      </div>
    </div>
  );
}