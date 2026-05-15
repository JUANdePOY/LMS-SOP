/**
 * Store optional fields not present on `activities` columns (see pafr.sql)
 * in `activities.description` as JSON while keeping human-readable fallback.
 */
function parseActivityMeta(description) {
  if (description == null || description === '') return {};
  if (typeof description !== 'string') return {};
  const trimmed = description.trim();
  if (!trimmed.startsWith('{')) return {};
  try {
    const o = JSON.parse(trimmed);
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function buildActivityDescription({ activityType, requirements }) {
  const meta = {};
  if (activityType) meta.activityType = activityType;
  if (requirements) meta.requirements = requirements;
  if (Object.keys(meta).length === 0) return null;
  return JSON.stringify(meta);
}

module.exports = { parseActivityMeta, buildActivityDescription };
