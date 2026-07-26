export const bumpVersion = (currentVersion = '1.0') => {
  const parts = String(currentVersion).split('.').map((part) => parseInt(part, 10) || 0);
  if (parts.length < 2) parts.push(0);
  if (parts[1] >= 9) {
    parts[0] += 1;
    parts[1] = 0;
  } else {
    parts[1] += 1;
  }
  return `${parts[0]}.${parts[1]}`;
};
