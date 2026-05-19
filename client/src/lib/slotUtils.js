export function computeTotalSlots(item) {
  if (!item) return null;
  if (item.total_slots != null) return Number(item.total_slots);
  if (item.capacity != null) return Number(item.capacity);
  if (item.max_participants != null) return Number(item.max_participants);
  const arr = item.squadron_slots || item.squadronSlots || item.squadron_limits || item.squadronLimits;
  if (Array.isArray(arr)) {
    return arr.reduce((sum, it) => {
      const v = it && (it.slot_limit ?? it.slotLimit ?? it.slot ?? it.slotlimit);
      const n = v == null || v === '' ? 0 : Number(v);
      return sum + (Number.isNaN(n) ? 0 : n);
    }, 0);
  }
  return null;
}
