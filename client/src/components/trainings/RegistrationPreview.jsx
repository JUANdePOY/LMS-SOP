import { useState } from "react";

// ─── Individual Field Renderer ─────────────────────────────────────────────────
function PreviewField({ field, index }) {
  const [value, setValue] = useState(field.type === "checkbox" ? {} : "");

  // Shared input base — matches your global neutral palette
  const base =
    "w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-800 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all";

  const renderInput = () => {
    switch (field.type) {
      case "text":
        return <input type="text" placeholder={field.placeholder} className={base} value={value} onChange={e => setValue(e.target.value)} />;
      case "number":
        return <input type="number" placeholder={field.placeholder} className={base} value={value} onChange={e => setValue(e.target.value)} />;
      case "email":
        return <input type="email" placeholder={field.placeholder} className={base} value={value} onChange={e => setValue(e.target.value)} />;
      case "phone":
        return <input type="tel" placeholder={field.placeholder} className={base} value={value} onChange={e => setValue(e.target.value)} />;
      case "date":
        return <input type="date" className={base} value={value} onChange={e => setValue(e.target.value)} />;
      case "textarea":
        return <textarea placeholder={field.placeholder} rows={3} className={`${base} resize-none`} value={value} onChange={e => setValue(e.target.value)} />;
      case "select":
        return (
          <select className={`${base} cursor-pointer`} value={value} onChange={e => setValue(e.target.value)}>
            <option value="">Choose an option...</option>
            {(field.options || []).map(opt => (
              <option key={opt.id} value={opt.label}>{opt.label}</option>
            ))}
          </select>
        );
      case "radio":
        return (
          <div className="space-y-2 pt-0.5">
            {(field.options || []).map(opt => (
              <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => setValue(opt.label)}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    value === opt.label
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-neutral-300 dark:border-neutral-600 group-hover:border-indigo-400"
                  }`}
                >
                  {value === opt.label && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <span className="text-sm text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 select-none transition-colors">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        );
      case "checkbox":
        return (
          <div className="space-y-2 pt-0.5">
            {(field.options || []).map(opt => (
              <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  onClick={() => setValue(prev => ({ ...prev, [opt.id]: !prev[opt.id] }))}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                    value[opt.id]
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-neutral-300 dark:border-neutral-600 group-hover:border-indigo-400"
                  }`}
                >
                  {value[opt.id] && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-neutral-600 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 select-none transition-colors">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-neutral-300 dark:text-neutral-600 w-4 text-right shrink-0 tabular-nums">
          {index + 1}.
        </span>
        <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {field.label || "Untitled Field"}
          {field.required && (
            <span className="text-red-500 ml-1 font-bold">*</span>
          )}
        </label>
      </div>
      <div className="pl-6">{renderInput()}</div>
    </div>
  );
}

// ─── Empty Preview ─────────────────────────────────────────────────────────────
function EmptyPreview() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6 py-8">
      <div className="w-12 h-12 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 flex items-center justify-center mb-3 bg-neutral-50 dark:bg-neutral-800/50">
        <svg className="w-5 h-5 text-neutral-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-neutral-400 dark:text-neutral-500 mb-1">No fields yet</p>
      <p className="text-xs text-neutral-300 dark:text-neutral-600 leading-relaxed">
        Add fields from the left panel<br />to preview the form here.
      </p>
    </div>
  );
}

// ─── Main Preview ──────────────────────────────────────────────────────────────
export default function RegistrationPreview({ fields, trainingTitle = "Training Registration" }) {
  if (fields.length === 0) return <EmptyPreview />;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">

      {/* Header — uses your --primary (indigo-500) */}
      <div className="relative px-5 py-4 bg-indigo-500 overflow-hidden">
        {/* Subtle decorative rings */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative">
          <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1.5">
            Registration Form — Preview
          </p>
          <h3 className="text-sm font-bold text-white leading-snug truncate">
            {trainingTitle}
          </h3>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-red-300 text-xs font-bold">*</span>
            <span className="text-[11px] text-indigo-200">Required fields must be completed</span>
          </div>
        </div>
      </div>

      {/* Meta bar */}
      <div className="flex items-center gap-2 px-5 py-2 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
          {fields.length} field{fields.length !== 1 ? "s" : ""} in this form
        </span>
        <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 italic">Preview mode</span>
      </div>

      {/* Fields */}
      <div className="px-5 py-4 space-y-4 bg-white dark:bg-neutral-900">
        {fields.map((field, i) => (
          <PreviewField key={field.id} field={field} index={i} />
        ))}
      </div>

      {/* Footer submit (decorative) */}
      <div className="px-5 pb-5 bg-white dark:bg-neutral-900">
        <div className="h-px bg-neutral-100 dark:bg-neutral-800 mb-4" />
        <button
          type="button"
          disabled
          className="w-full bg-indigo-500 text-white text-sm font-bold py-2.5 rounded-lg opacity-40 cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          Submit Registration
        </button>
        <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500 mt-2">
          Preview only — submission is disabled
        </p>
      </div>
    </div>
  );
}