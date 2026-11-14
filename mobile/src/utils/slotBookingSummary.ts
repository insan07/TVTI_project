import { practicalInstant } from './practicalTime';

export function slotBookingSummary(slot: any): string {
  const start = practicalInstant(slot, 'start');
  const date = Number.isFinite(start) ? new Date(start).toLocaleDateString('en-GB', {
    timeZone: 'Asia/Colombo', weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
  }) : slot.day_of_week;
  return [slot.batch_id?.course_id?.title || 'Practical session', slot.batch_id?.name,
    `${date} · ${slot.start_time}–${slot.end_time} (Sri Lanka time)`, slot.location,
    slot.instructor_id?.name ? `Instructor: ${slot.instructor_id.name}` : null].filter(Boolean).join('\n');
}
