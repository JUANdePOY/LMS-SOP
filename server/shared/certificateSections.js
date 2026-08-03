const crypto = require('crypto');

/**
 * Fixed certificate section definitions.
 *
 * These are the single source of truth for layout and defaults.
 * Both the frontend preview and the pdf-lib renderer consume this list,
 * so preview and final PDF can never drift apart.
 */
const CERTIFICATE_SECTIONS = [
  { key: 'title',             label: 'Title',               yPercent: 10, defaultFontSize: 32, defaultWeight: 'bold',   dynamic: false },
  { key: 'presentation_line', label: 'Presentation Line',   yPercent: 22, defaultFontSize: 16, defaultStyle: 'italic',  dynamic: false },
  { key: 'recipient_name',    label: 'Recipient Name',      yPercent: 34, defaultFontSize: 40, defaultWeight: 'bold',   dynamic: true  },
  { key: 'description',       label: 'Description / Reason',yPercent: 50, defaultFontSize: 16, defaultLineHeight: 1.2,                        dynamic: false },
  { key: 'date',              label: 'Date',                yPercent: 68, defaultFontSize: 14,                         dynamic: true  },
  { key: 'signatures_seal',   label: 'Signatures & Seal',   yPercent: 82, defaultFontSize: 12, defaultLineHeight: 1.3,                        dynamic: false },
];

/**
 * Merge a raw sections payload with the fixed defaults.
 * Ensures every section has the expected keys even when the client
 * only sends partial data.
 */
function normalizeSections(raw = {}) {
  const out = {};
  for (const section of CERTIFICATE_SECTIONS) {
    const incoming = raw[section.key] || {};
    out[section.key] = {
      text: incoming.text || '',
      font_size: incoming.font_size || section.defaultFontSize,
      font_weight: incoming.font_weight || section.defaultWeight || 'normal',
      font_style: incoming.font_style || section.defaultStyle || 'normal',
      line_height: incoming.line_height || section.defaultLineHeight || 1.4,
    };
    if (section.key === 'signatures_seal') {
      out[section.key].items = Array.isArray(incoming.items) ? incoming.items : [];
    }
  }
  return out;
}

/**
 * Return a deep-cloned sections object with dynamic fields resolved
 * from overrides (recipient_name, date).
 */
function resolveDynamicSections(templateSections, overrides = {}) {
  const resolved = JSON.parse(JSON.stringify(templateSections));
  if (overrides.recipient_name) {
    resolved.recipient_name.text = overrides.recipient_name;
  }
  if (overrides.date) {
    resolved.date.text = overrides.date;
  }
  return resolved;
}

module.exports = {
  CERTIFICATE_SECTIONS,
  normalizeSections,
  resolveDynamicSections,
};
