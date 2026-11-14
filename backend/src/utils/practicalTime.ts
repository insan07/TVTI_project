// Timetable dates and HH:mm times are always institute time (Asia/Colombo).
export const PRACTICAL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLOMBO_OFFSET_MS = 330 * 60_000;

export function weekDate(value: unknown): Date {
  const text = value instanceof Date ? value.toISOString() : String(value || '');
  const match = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(text);
  if (!match) throw new Error('Enter a valid week start date.');
  const date = new Date(`${match[1]}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== match[1] || date.getUTCDay() !== 1) {
    throw new Error('Week start must be a valid Monday.');
  }
  return date;
}

export function timeMinutes(value: unknown): number {
  if (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Times must use HH:mm (24-hour time).');
  return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
}

export function slotTimes(slot: any): { start: number; end: number } {
  const day = PRACTICAL_DAYS.indexOf(slot.day_of_week);
  if (day < 0) throw new Error('Select a valid day of the week.');
  const start = timeMinutes(slot.start_time), end = timeMinutes(slot.end_time);
  if (end <= start) throw new Error('End time must be after start time on the same day.');
  const midnight = weekDate(slot.week_start_date).getTime() + day * 86_400_000 - COLOMBO_OFFSET_MS;
  return { start: midnight + start * 60_000, end: midnight + end * 60_000 };
}

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

export function slotTiming(slot: any, now = Date.now()) {
  const { start, end } = slotTimes(slot);
  const deadline = slot.booking_deadline ? new Date(slot.booking_deadline).getTime() : start;
  return { starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString(),
    booking_closes_at: new Date(Math.min(start, deadline)).toISOString(), is_expired: now >= end };
}
