export const compareVersions = (prevVersion = {}, nextVersion = {}) => {
  const changes = [];
  const keys = ['title', 'description', 'status', 'version'];
  for (const key of keys) {
    if (prevVersion[key] !== nextVersion[key]) {
      changes.push({ field: key, from: prevVersion[key], to: nextVersion[key] });
    }
  }
  return changes;
};
