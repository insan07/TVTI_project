import { ClientSession } from 'mongoose';
import Course from '../models/Course';
import Batch from '../models/Batch';
import User from '../models/User';
import Enrollment from '../models/Enrollment';
import Video from '../models/Video';
import Result from '../models/Result';
import Attendance from '../models/Attendance';
import Announcement from '../models/Announcement';
import Application from '../models/Application';
import PracticeSlot from '../models/PracticeSlot';
import SlotBooking from '../models/SlotBooking';
import { ACTIVE_BOOKINGS, practicalMutation, PracticalError, slotTimes } from './practicalScheduling';

export const validManagementId = (value: unknown) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const requiredText = (value: unknown, label: string, max = 4000) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new PracticalError(400, `Enter a valid ${label}.`);
  return value.trim();
};
export function courseValues(body: any) {
  const title = requiredText(body.title, 'course title', 200), description = requiredText(body.description, 'description');
  const fee = Number(body.fee), duration_weeks = Number(body.duration_weeks);
  if (!['string', 'number'].includes(typeof body.fee) || String(body.fee).trim() === '' || !Number.isFinite(fee) || fee < 0) throw new PracticalError(400, 'Course fee must be zero or a positive number.');
  if (!['string', 'number'].includes(typeof body.duration_weeks) || !Number.isInteger(duration_weeks) || duration_weeks < 1) throw new PracticalError(400, 'Duration must be a positive whole number of weeks.');
  if (typeof body.is_active !== 'boolean') throw new PracticalError(400, 'Select a valid course status.');
  if (body.prerequisites != null && (typeof body.prerequisites !== 'string' || body.prerequisites.length > 4000)) throw new PracticalError(400, 'Enter valid prerequisites.');
  return { title, description, fee, duration_weeks, is_active: body.is_active, prerequisites: body.prerequisites?.trim() || '' };
}

export async function deleteUnusedCourse(courseId: string) {
  if (!validManagementId(courseId)) throw new PracticalError(400, 'Invalid course.');
  return practicalMutation(async session => {
    const course = await Course.findById(courseId).session(session);
    if (!course) throw new PracticalError(404, 'Course not found.');
    if (await Batch.exists({ course_id: course._id }).session(session) || await Application.exists({ $or: [{ course_id: course._id }, { course_ids: course._id }] }).session(session)) {
      throw new PracticalError(409, 'This course has batches or applications. Archive it to retain its records. Only unused courses can be deleted.');
    }
    await course.deleteOne({ session });
  });
}

async function hasBatchRecords(batchId: any, session: ClientSession) {
  // Preserve the identity and history of batches referenced anywhere in the app.
  for (const model of [Enrollment, Video, Result, Attendance, Announcement, PracticeSlot] as any[]) {
    if (await model.exists({ batch_id: batchId }).session(session)) return true;
  }
  return !!await Application.exists({ assigned_batch_ids: batchId }).session(session);
}

export async function saveManagedBatch(batchId: string | null, body: any) {
  if (batchId && !validManagementId(batchId)) throw new PracticalError(400, 'Invalid batch.');
  return practicalMutation(async session => {
    const existing = batchId ? await Batch.findById(batchId).session(session) : null;
    if (batchId && !existing) throw new PracticalError(404, 'Batch not found.');
    const input = { ...(existing?.toObject() || {}), ...body };
    const name = requiredText(input.name, 'batch name', 200);
    if (!validManagementId(String(input.course_id))) throw new PracticalError(400, 'Select a valid course.');
    const course = await Course.findById(input.course_id).session(session);
    if (!course || (!course.is_active && (!existing || String(existing.course_id) !== String(course._id)))) throw new PracticalError(400, 'Select an active course.');
    const capacity = Number(input.capacity);
    if (!['string', 'number'].includes(typeof input.capacity) || !Number.isInteger(capacity) || capacity < 1) throw new PracticalError(400, 'Capacity must be a positive whole number.');
    const start_date = new Date(input.start_date), end_date = new Date(input.end_date);
    const validDate = (value: any) => value instanceof Date ? Number.isFinite(+value) : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) === value.slice(0, 10);
    if (!validDate(input.start_date) || !validDate(input.end_date) || end_date < start_date) throw new PracticalError(400, 'Enter valid dates, with the end date on or after the start date.');
    const status = input.status || 'active';
    if (!['active', 'completed', 'cancelled'].includes(status)) throw new PracticalError(400, 'Select a valid batch status.');
    const instructorIds = input.instructor_ids || [];
    if (!Array.isArray(instructorIds) || instructorIds.some(id => !validManagementId(String(id))) || new Set(instructorIds.map(String)).size !== instructorIds.length) throw new PracticalError(400, 'Select each instructor only once.');
    const instructors = await User.find({ _id: { $in: instructorIds }, role: 'instructor' }).session(session);
    if (instructors.length !== instructorIds.length || instructors.some(instructor => !instructor.is_active && !existing?.instructor_ids.some(id => String(id) === String(instructor._id)))) throw new PracticalError(400, 'Select active instructors.');
    const schedule = input.schedule_json;
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (!Array.isArray(schedule?.days) || !schedule.days.length || schedule.days.some((day: any) => !weekdays.includes(day)) || new Set(schedule.days).size !== schedule.days.length) throw new PracticalError(400, 'Select valid schedule days.');
    const time = requiredText(schedule.time, 'class time', 100);
    // Structured clock ranges avoid ambiguous schedules in all three roles.
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(time);
    const minutes = (hour: string, minute: string, period?: string) => {
      const h = Number(hour), m = Number(minute);
      if (m > 59 || h > (period ? 12 : 23) || (period && h < 1)) return NaN;
      return (period ? h % 12 + (period.toUpperCase() === 'PM' ? 12 : 0) : h) * 60 + m;
    };
    if (!match || !!match[3] !== !!match[6] || !(minutes(match[4], match[5], match[6]) > minutes(match[1], match[2], match[3]))) throw new PracticalError(400, 'Enter class time as 09:00 - 12:00 or 9:00 AM - 12:00 PM, with end after start.');
    const room = requiredText(input.room, 'room or location', 200);
    if (existing) {
      if (capacity < await Enrollment.countDocuments({ batch_id: existing._id, status: { $ne: 'dropped' } }).session(session)) throw new PracticalError(409, 'Capacity cannot be lower than the enrolled student count.');
      if (String(existing.course_id) !== String(input.course_id) && await hasBatchRecords(existing._id, session)) throw new PracticalError(409, 'A batch with records cannot be moved to another course. Create a new batch instead.');
      const slots = await PracticeSlot.find({ batch_id: existing._id }).session(session);
      const upcoming = slots.filter(slot => slotTimes(slot).end > Date.now());
      if (status === 'active' && existing.status !== 'active' && upcoming.length) throw new PracticalError(409, 'Remove obsolete upcoming practical slots before reactivating this batch, then create a fresh timetable.');
      if (status !== 'active') {
        if (await SlotBooking.exists({ slot_id: { $in: upcoming.map(slot => slot._id) }, status: { $in: ACTIVE_BOOKINGS } }).session(session)) throw new PracticalError(409, 'Cancel upcoming practical bookings before completing or cancelling this batch.');
        await PracticeSlot.updateMany({ _id: { $in: upcoming.map(slot => slot._id) } }, { is_open: false }, { session });
      } else if (upcoming.some(slot => !instructorIds.map(String).includes(String(slot.instructor_id)))) throw new PracticalError(409, 'Reassign or remove upcoming practical slots before removing their instructor.');
    }
    const values = { name, course_id: course._id, capacity, start_date, end_date, status, instructor_ids: instructorIds, room, schedule_json: { days: weekdays.filter(day => schedule.days.includes(day)), time } };
    const previousInstructorIds = existing?.instructor_ids.map(String) || [];
    if (existing) { Object.assign(existing, values); await existing.save({ session }); return { batch: existing, previousInstructorIds }; }
    const [batch] = await Batch.create([values], { session });
    return { batch, previousInstructorIds };
  });
}

export async function deleteEmptyBatch(batchId: string) {
  if (!validManagementId(batchId)) throw new PracticalError(400, 'Invalid batch.');
  return practicalMutation(async session => {
    const batch = await Batch.findById(batchId).session(session);
    if (!batch) throw new PracticalError(404, 'Batch not found.');
    if (await hasBatchRecords(batch._id, session)) throw new PracticalError(409, 'This batch has student or teaching records. Complete or cancel it to preserve its history. Only empty batches can be deleted.');
    await batch.deleteOne({ session });
  });
}
