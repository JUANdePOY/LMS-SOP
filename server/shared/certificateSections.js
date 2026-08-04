const crypto = require('crypto');

/**
 * Fixed certificate section definitions.
 *
 * These are the single source of truth for layout and defaults.
 * Both the frontend preview and the pdf-lib renderer consume this list,
 * so preview and final PDF can never drift apart.
 */
const CERTIFICATE_SECTIONS = [
  {
    key: 'title',
    label: 'Title',
    xPercent: 50,
    yPercent: 14,
    defaultFontSize: 44,
    minFontSize: 28,
    maxFontSize: 64,
    defaultWeight: 'bold',
    defaultAlign: 'center',
    defaultFontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
    defaultLineHeight: 1.1,
    letterSpacing: '0.04em',
    uppercase: true,
    defaultWidthPercent: 85,
    defaultSecondLineFontSize: 32,
    defaultSecondLineWeight: 'normal',
    defaultSecondLineStyle: 'normal',
    dynamic: false,
  },
  {
    key: 'presentation_line',
    label: 'Presentation Line',
    xPercent: 50,
    yPercent: 23,
    defaultFontSize: 16,
    minFontSize: 10,
    maxFontSize: 24,
    defaultStyle: 'normal',
    defaultAlign: 'center',
    defaultFontFamily: "Inter, system-ui, -apple-system, sans-serif",
    defaultLineHeight: 1.3,
    letterSpacing: '0.12em',
    uppercase: true,
    defaultWidthPercent: 70,
    dynamic: false,
  },
  {
    key: 'recipient_name',
    label: 'Recipient Name',
    xPercent: 50,
    yPercent: 47,
    defaultFontSize: 40,
    minFontSize: 24,
    maxFontSize: 64,
    defaultWeight: 'normal',
    defaultAlign: 'center',
    defaultFontFamily: "'Brush Script MT', 'Segoe Script', cursive",
    defaultLineHeight: 1.15,
    underline: true,
    defaultWidthPercent: 80,
    dynamic: true,
  },
  {
    key: 'description',
    label: 'Description / Reason',
    xPercent: 50,
    yPercent: 63,
    defaultFontSize: 15,
    minFontSize: 11,
    maxFontSize: 22,
    defaultAlign: 'center',
    defaultFontFamily: "Inter, system-ui, -apple-system, sans-serif",
    defaultLineHeight: 1.2,
    defaultWidthPercent: 62,
    dynamic: false,
  },
  {
    key: 'date',
    label: 'Date',
    xPercent: 50,
    yPercent: 85,
    defaultFontSize: 13,
    minFontSize: 10,
    maxFontSize: 18,
    defaultAlign: 'center',
    defaultFontFamily: "Inter, system-ui, -apple-system, sans-serif",
    defaultLineHeight: 1.3,
    defaultWidthPercent: 32,
    dynamic: true,
  },
  {
    key: 'signatures_seal',
    label: 'Signatures & Seal',
    xPercent: 84,
    yPercent: 85,
    defaultFontSize: 13,
    minFontSize: 10,
    maxFontSize: 18,
    defaultAlign: 'center',
    defaultFontFamily: "Inter, system-ui, -apple-system, sans-serif",
    defaultLineHeight: 1.3,
    defaultWidthPercent: 32,
    dynamic: false,
  },
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
      x_percent: incoming.x_percent ?? section.xPercent ?? 50,
      y_percent: incoming.y_percent ?? section.yPercent ?? 50,
      width_percent: incoming.width_percent ?? section.defaultWidthPercent ?? 80,
      text_align: incoming.text_align || section.defaultAlign || 'center',
      font_size: incoming.font_size || section.defaultFontSize,
      font_weight: incoming.font_weight || section.defaultWeight || 'normal',
      font_style: incoming.font_style || section.defaultStyle || 'normal',
      font_family: incoming.font_family || section.defaultFontFamily || 'inherit',
      line_height: incoming.line_height || section.defaultLineHeight || 1.2,
    };
    if (section.key === 'title') {
      out[section.key].title_second_font_size = incoming.title_second_font_size || section.defaultSecondLineFontSize || Math.round((section.defaultFontSize || 32) * 0.75);
      out[section.key].title_second_font_weight = incoming.title_second_font_weight || section.defaultSecondLineWeight || 'normal';
      out[section.key].title_second_font_style = incoming.title_second_font_style || section.defaultSecondLineStyle || section.defaultStyle || 'normal';
    }
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
