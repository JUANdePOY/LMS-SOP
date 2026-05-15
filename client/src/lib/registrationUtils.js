// ─── Field Type Definitions ───────────────────────────────────────────────────

export const FIELD_TYPES = [
  { value: "text",     label: "Text Input",      icon: "Aa" },
  { value: "number",   label: "Number Input",     icon: "12" },
  { value: "textarea", label: "Textarea",         icon: "¶" },
  { value: "select",   label: "Dropdown Select",  icon: "▾" },
  { value: "checkbox", label: "Checkbox",         icon: "☑" },
  { value: "radio",    label: "Radio Button",     icon: "◉" },
  { value: "date",     label: "Date Input",       icon: "📅" },
  { value: "email",    label: "Email Input",      icon: "@" },
  { value: "phone",    label: "Phone Number",     icon: "☎" },
];

export const FIELD_TYPE_MAP = Object.fromEntries(
  FIELD_TYPES.map((t) => [t.value, t])
);

// ─── ID Generator ─────────────────────────────────────────────────────────────

export function generateFieldId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Default Placeholders by Type ─────────────────────────────────────────────

const DEFAULT_PLACEHOLDERS = {
  text:     "Enter text...",
  number:   "Enter a number...",
  textarea: "Enter details...",
  select:   "",
  checkbox: "",
  radio:    "",
  date:     "",
  email:    "example@email.com",
  phone:    "+1 (___) ___-____",
};

const DEFAULT_LABELS = {
  text:     "Text Field",
  number:   "Number Field",
  textarea: "Description",
  select:   "Select Option",
  checkbox: "Checkbox Field",
  radio:    "Radio Selection",
  date:     "Date",
  email:    "Email Address",
  phone:    "Phone Number",
};

// ─── Field Factory ─────────────────────────────────────────────────────────────

export function createDefaultField(type) {
  const hasOptions = type === "select" || type === "radio" || type === "checkbox";

  return {
    id:          generateFieldId(),
    type,
    label:       DEFAULT_LABELS[type] || "New Field",
    placeholder: DEFAULT_PLACEHOLDERS[type] || "",
    required:    false,
    options:     hasOptions
      ? [
          { id: generateFieldId(), label: "Option 1" },
          { id: generateFieldId(), label: "Option 2" },
        ]
      : [],
  };
}

// ─── Field Reordering ─────────────────────────────────────────────────────────

export function reorderFields(fields, fromIndex, toIndex) {
  const result = [...fields];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateRegistrationForm(fields, values) {
  const errors = {};
  fields.forEach((field) => {
    const value = values[field.id];
    if (field.required) {
      if (value === undefined || value === null || value === "") {
        errors[field.id] = `${field.label} is required.`;
      }
    }
  });
  return errors;
}

// ─── Field Serialization ──────────────────────────────────────────────────────

export function serializeFields(fields) {
  return JSON.stringify(fields);
}

export function deserializeFields(json) {
  try {
    return JSON.parse(json) || [];
  } catch {
    return [];
  }
}

// ─── Type Guards ──────────────────────────────────────────────────────────────

export const hasOptions = (type) =>
  ["select", "radio", "checkbox"].includes(type);

export const hasPlaceholder = (type) =>
  ["text", "number", "textarea", "email", "phone"].includes(type);
