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

  if (body.business_id !== undefined) {
    if (body.business_id === null || body.business_id === '') {
      value.business_id = null;
    } else {
      const id = Number(body.business_id);
      if (!Number.isInteger(id) || id <= 0) {
        errors.push('Business ID must be a positive integer');
      } else {
        value.business_id = id;
      }
    }
  }

   if (body.color !== undefined) {
     if (body.color === null || body.color === '') {
       value.color = null;
     } else {
       const hex = String(body.color).trim();
       if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
         errors.push('Color must be a valid hex value (e.g. #C14E08)');
       } else {
         value.color = hex;
       }
     }
   }

   if (body.department_id !== undefined) {
     if (body.department_id === null || body.department_id === '') {
       value.department_id = null;
     } else {
       const id = Number(body.department_id);
       if (!Number.isInteger(id) || id <= 0) {
         errors.push('Department ID must be a positive integer');
       } else {
         value.department_id = id;
       }
     }
   }

   return { valid: errors.length === 0, value, errors };
}

module.exports = { validateClientPayload };
