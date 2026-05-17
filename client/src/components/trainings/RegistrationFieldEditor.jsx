import { useState } from "react";
import { hasOptions, hasPlaceholder, FIELD_TYPES } from "@/lib/registrationUtils";

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 ${
          checked ? "bg-indigo-500" : "bg-neutral-300 dark:bg-neutral-600"
        }`}
        style={{ height: '18px', width: '34px' }}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
      <span className={`text-xs font-semibold transition-colors ${
        checked
          ? "text-indigo-600 dark:text-indigo-400"
          : "text-neutral-400 dark:text-neutral-500"
      }`}>
        {checked ? "Required" : "Optional"}
      </span>
    </label>
  );
}

// ─── Options Editor ────────────────────────────────────────────────────────────
function OptionsEditor({ options = [], fieldId, onAdd, onUpdate, onRemove }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
          Options
        </span>
        <button
          type="button"
          onClick={() => onAdd(fieldId)}
          className="flex items-center gap-1 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Option
        </button>
      </div>
      <div className="space-y-1.5">
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-300 dark:text-neutral-600 w-4 text-right shrink-0 tabular-nums">{idx + 1}.</span>
            <input
              type="text"
              value={opt.label}
              onChange={(e) => onUpdate(fieldId, opt.id, e.target.value)}
              className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1 text-xs text-neutral-700 dark:text-neutral-200 placeholder-neutral-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
              placeholder={`Option ${idx + 1}...`}
            />
            <button
              type="button"
              onClick={() => onRemove(fieldId, opt.id)}
              className="p-0.5 text-neutral-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {options.length === 0 && (
          <p className="text-[11px] text-neutral-300 dark:text-neutral-600 italic pl-6">No options yet.</p>
        )}
      </div>
    </div>
  );
}

// ─── Field Configuration Card ──────────────────────────────────────────────────
export default function RegistrationFieldEditor({
  field, index, total, isActive, onActivate,
  onUpdate, onRemove, onToggleRequired,
  onAddOption, onUpdateOption, onRemoveOption, onMove,
}) {
  const typeInfo = FIELD_TYPES.find(t => t.value === field.type);

  const inputCls =
    "w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-200 placeholder-neutral-300 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all";

  return (
    <div className={`rounded-lg border transition-all duration-150 ${
      isActive
        ? "border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/40 dark:bg-indigo-500/5 shadow-sm"
        : "border-neutral-200 dark:border-neutral-700/60 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-600"
    }`}>

      {/* ── Collapsed Header Row ── */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
        onClick={onActivate}
      >
        {/* Drag handle */}
        <div className="flex flex-col gap-[3px] shrink-0 opacity-30 hover:opacity-60 transition-opacity">
          <span className="block w-3 h-px bg-neutral-500 rounded" />
          <span className="block w-3 h-px bg-neutral-500 rounded" />
          <span className="block w-3 h-px bg-neutral-500 rounded" />
        </div>

        {/* Type badge */}
        <span className="text-[10px] font-bold font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5 shrink-0 min-w-[24px] text-center">
          {typeInfo?.icon || "?"}
        </span>

        {/* Label + type name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 truncate leading-tight">
            {field.label || "Untitled Field"}
          </p>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{typeInfo?.label}</p>
        </div>

        {/* Required pill */}
        {field.required && (
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-full px-1.5 py-0.5 shrink-0">
            REQ
          </span>
        )}

        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 shrink-0 ${isActive ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* ── Expanded Body ── */}
      {isActive && (
        <div className="px-3 pb-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-3">

          {/* Label */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
              Field Label
            </label>
            <input
              type="text"
              value={field.label}
              onChange={e => onUpdate(field.id, { label: e.target.value })}
              className={inputCls}
              placeholder="Enter field label..."
            />
          </div>

          {/* Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
              Field Type
            </label>
            <select
              value={field.type}
              onChange={e => onUpdate(field.id, { type: e.target.value, options: [] })}
              className={inputCls}
            >
              {FIELD_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Placeholder */}
          {hasPlaceholder(field.type) && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                Placeholder Text
              </label>
              <input
                type="text"
                value={field.placeholder || ""}
                onChange={e => onUpdate(field.id, { placeholder: e.target.value })}
                className={inputCls}
                placeholder="Hint text shown inside the field..."
              />
            </div>
          )}

          {/* Options */}
          {hasOptions(field.type) && (
            <OptionsEditor
              options={field.options}
              fieldId={field.id}
              onAdd={onAddOption}
              onUpdate={onUpdateOption}
              onRemove={onRemoveOption}
            />
          )}

          {/* Footer: toggle + move + delete */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Toggle
              checked={field.required}
              onChange={() => onToggleRequired(field.id)}
            />
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onMove(index, index - 1)}
                disabled={index === 0}
                title="Move up"
                className="p-1 text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onMove(index, index + 1)}
                disabled={index === total - 1}
                title="Move down"
                className="p-1 text-neutral-300 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors rounded"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="w-px h-3 bg-neutral-200 dark:bg-neutral-700 mx-1" />
              <button
                type="button"
                onClick={() => onRemove(field.id)}
                title="Remove field"
                className="p-1 text-neutral-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}