import { getSlotActualDate } from './studentSchedule';
import { instituteDateKey } from './practicalTime';

export type ScheduleViewMode = 'List' | 'Month' | 'Week' | 'Day';
export const scheduleDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function scheduleToday(): Date {
  const [year, month, day] = instituteDateKey().split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function scheduleWeekStart(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return monday;
}

export function shiftScheduleDate(date: Date, mode: ScheduleViewMode, offset: number): Date {
  if (mode === 'Month') {
    const month = new Date(date.getFullYear(), date.getMonth() + offset, 1);
    return new Date(month.getFullYear(), month.getMonth(), Math.min(date.getDate(), new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()));
  }
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + offset * (mode === 'Week' ? 7 : 1));
  return next;
}

export function schedulePeriod(mode: ScheduleViewMode, date: Date): { start: Date; end: Date } {
  const start = mode === 'Month' ? new Date(date.getFullYear(), date.getMonth(), 1)
    : mode === 'Week' ? scheduleWeekStart(date) : new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  if (mode === 'Month') end.setMonth(end.getMonth() + 1); else end.setDate(end.getDate() + (mode === 'Week' ? 7 : 1));
  return { start, end };
}

export function slotsForScheduleView(slots: any[], mode: ScheduleViewMode, date: Date): any[] {
  if (mode === 'List') return slots;
  const { start, end } = schedulePeriod(mode, date);
  return slots.filter(slot => {
    const actual = getSlotActualDate(slot.week_start_date, slot.day_of_week);
    return actual >= start && actual < end;
  });
}

export function scheduleCalendarDates(mode: 'Month' | 'Week', date: Date): Date[] {
  const first = mode === 'Month' ? new Date(date.getFullYear(), date.getMonth(), 1) : date;
  const start = scheduleWeekStart(first);
  const offset = (first.getDay() + 6) % 7;
  const count = mode === 'Week' ? 7 : Math.ceil((offset + new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

export function schedulePeriodLabel(mode: ScheduleViewMode, date: Date): string {
  if (mode === 'Month') return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  if (mode === 'Week') {
    const { start, end } = schedulePeriod(mode, date);
    end.setDate(end.getDate() - 1);
    return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

export function regularBatchesForScheduleView(batches: any[], mode: ScheduleViewMode, date: Date): any[] {
  if (mode !== 'Day') return batches;
  const day = date.toLocaleDateString('en-GB', { weekday: 'short' }).toLowerCase();
  return batches.filter(batch => {
    const raw = batch.schedule_json?.days;
    const days = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[,\s/]+/) : [];
    return days.length === 0 || days.some((value: any) => String(value).slice(0, 3).toLowerCase() === day);
  });
}
