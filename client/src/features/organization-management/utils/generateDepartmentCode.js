export const generateDepartmentCode = (name, prefix = 'DEPT') => {
  const cleanPrefix = String(prefix || 'DEPT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'DEPT';
  const cleanName = String(name || 'DEPT').toUpperCase().replace(/[^A-Z]/g, '');
  const suffix = cleanName.slice(0, 3).padEnd(3, 'X');
  const stamp = String(Date.now()).slice(-4);
  return `${cleanPrefix}-${stamp}-${suffix}`;
};