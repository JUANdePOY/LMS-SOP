// Local quiet-hours check matching the server's logic, so the UI can suppress
// badge pulses / sound previews without a round-trip on every notification.
export function isQuietHours(prefs) {
  if (!prefs || !prefs.quiet_hours_enabled) return false;
  const tz = prefs.timezone || 'UTC';
  let now;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const h = parts.find((p) => p.type === 'hour')?.value || '00';
    const m = parts.find((p) => p.type === 'minute')?.value || '00';
    now = `${h}:${m}`;
  } catch {
    const d = new Date();
    now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const start = (prefs.quiet_hours_start || '22:00').slice(0, 5);
  const end = (prefs.quiet_hours_end || '07:00').slice(0, 5);
  if (start <= end) return now >= start && now < end;
  return now >= start || now < end;
}
