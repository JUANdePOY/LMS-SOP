// Small pure helpers used by HierarchyNode / BusinessAccordion to derive
// aggregate stats from a recursive department/unit tree.
//
// Expected (optional) fields on each node, in addition to what you already
// have (id, name, head_name, sop_count, children):
//   code            short badge text, e.g. "TOG (R) 10", "ARCEN (R)"
//   unit_type       label used to group terminal units, e.g. "sqdn", "grp"
//   children_label  label for the leaf-grid header, e.g. "SQUADRONS"
//   status          "active" | "inactive" (terminal nodes only)
//   location        string, terminal nodes only
//   member_count    number; if omitted it's derived by summing leaves

export function isLeafNode(node) {
  return !node.children || node.children.length === 0;
}

/** Recursively counts terminal (leaf) units and how many are active. */
export function countLeaves(node) {
  if (isLeafNode(node)) {
    return { total: 1, active: node.status === 'inactive' ? 0 : 1 };
  }
  return node.children.reduce(
    (acc, child) => {
      const c = countLeaves(child);
      return { total: acc.total + c.total, active: acc.active + c.active };
    },
    { total: 0, active: 0 }
  );
}

/** Sums member_count across all descendant leaves (fallback when a node has no member_count of its own). */
export function sumMembers(node) {
  if (isLeafNode(node)) return node.member_count || 0;
  return (node.children || []).reduce((sum, child) => sum + sumMembers(child), 0);
}

/** Builds a string like "5 sqdn · 2 grp" from unit_type fields found anywhere below this node. */
export function summarizeUnitTypes(node) {
  const counts = {};

  function walk(n) {
    if (n.unit_type) {
      counts[n.unit_type] = (counts[n.unit_type] || 0) + 1;
    }
    (n.children || []).forEach(walk);
  }

  (node.children || []).forEach(walk);

  const entries = Object.entries(counts);
  if (entries.length === 0) return null;
  return entries.map(([label, count]) => `${count} ${label}`).join(' \u00b7 ');
}
