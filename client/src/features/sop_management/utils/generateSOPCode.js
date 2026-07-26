export const generateSOPCode = (title, prefix = 'SOP') => {
  const cleanPrefix = String(prefix || 'SOP').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'SOP';
  const cleanTitle = String(title || 'SOP').toUpperCase().replace(/[^A-Z]/g, '');
  const suffix = cleanTitle.slice(0, 3).padEnd(3, 'X');
  const stamp = String(Date.now()).slice(-4);
  return `${cleanPrefix}-${stamp}-${suffix}`;
};
