export function getSlotActualDate(weekStart: string, dayOfWeek: string): Date {
  const match = weekStart?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(weekStart);
  const day = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(dayOfWeek);
  if (day >= 0) date.setDate(date.getDate() + day);
  return date;
}

export function scheduleBatches(batches: any[], selectedBatchId: string | null): any[] {
  return selectedBatchId === null ? batches : batches.filter(batch => batch._id === selectedBatchId);
}

export async function loadScheduleSlots(
  batches: any[], selectedBatchId: string | null, load: (params: { batchId: string }) => Promise<any[]>,
): Promise<any[]> {
  const groups = await Promise.all(scheduleBatches(batches, selectedBatchId).map(async batch => {
    const slots = await load({ batchId: batch._id });
    return slots.map(slot => ({ ...slot, batch_id: batch }));
  }));
  return groups.flat().sort((a, b) =>
    getSlotActualDate(b.week_start_date, b.day_of_week).getTime() - getSlotActualDate(a.week_start_date, a.day_of_week).getTime()
    || b.start_time.localeCompare(a.start_time));
}

export function hasWeeklyBooking(slots: any[], slot: any): boolean {
  const batchId = (value: any) => String(value?.batch_id?._id ?? value?.batch_id);
  return slots.some(other => other.already_booked && batchId(other) === batchId(slot)
    && other.week_start_date === slot.week_start_date);
}
