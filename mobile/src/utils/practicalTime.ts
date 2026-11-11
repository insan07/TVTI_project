// Slot wall times belong to the institute, regardless of the device timezone.
export function practicalInstant(slot: any, edge: 'start' | 'end'): number {
  const server = Date.parse(slot?.[edge === 'start' ? 'starts_at' : 'ends_at']);
  if (Number.isFinite(server)) return server;
  const match = String(slot?.week_start_date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  const time = String(slot?.[edge === 'start' ? 'start_time' : 'end_time'] || '').match(/^(\d{2}):(\d{2})$/);
  const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(slot?.day_of_week);
  if (!match || !time || day < 0) return NaN;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + day, Number(time[1]), Number(time[2])) - 330 * 60_000;
}

export function isPracticalExpired(slot: any, now = Date.now()): boolean {
  const end = practicalInstant(slot, 'end');
  return Number.isFinite(end) ? now >= end : !!slot?.is_expired;
}

export function practicalBookingClosed(slot: any, now = Date.now()): boolean {
  const start = practicalInstant(slot, 'start');
  const deadline = Date.parse(slot?.booking_closes_at || slot?.booking_deadline);
  return (Number.isFinite(start) && now >= start) || (Number.isFinite(deadline) && now >= deadline);
}

export function instituteDateKey(now = Date.now()): string {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}

export function instituteWallTime(date: Date, time: string): number {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return Date.parse(`${key}T${time}:00+05:30`);
}
