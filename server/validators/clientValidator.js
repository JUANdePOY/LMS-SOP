function validateClientPayload(body, requireAll = true) {
  const errors = [];
  const value = {};

  const name = body.client_name !== undefined ? String(body.client_name || '').trim() : '';
  if (requireAll || body.client_name !== undefined) {
    if (!name) {
      errors.push('Client name is required');
    } else if (name.length > 255) {
      errors.push('Client name must not exceed 255 characters');
    } else {
      value.client_name = name;
    }
  }

  if (body.businesses !== undefined) {
    if (!Array.isArray(body.businesses)) {
      errors.push('Businesses must be an array');
    } else {
      const seen = new Set();
      const cleaned = [];
      for (const raw of body.businesses) {
        const b = raw && String(raw).trim();
        if (!b) continue;
        if (b.length > 255) {
          errors.push(`Business name "${b}" exceeds 255 characters`);
          continue;
        }
        const key = b.toLowerCase();
        if (seen.has(key)) {
          errors.push(`Duplicate business name: ${b}`);
          continue;
        }
        seen.add(key);
        cleaned.push(b);
      }
      value.businesses = cleaned;
    }
  }

  return { valid: errors.length === 0, value, errors };
}

module.exports = { validateClientPayload };
