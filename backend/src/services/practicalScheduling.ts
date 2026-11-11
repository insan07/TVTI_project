import mongoose, { ClientSession, Schema } from 'mongoose';
import PracticeSlot from '../models/PracticeSlot';
import SlotBooking from '../models/SlotBooking';
import Enrollment from '../models/Enrollment';
import Batch from '../models/Batch';
import User from '../models/User';
import { overlaps, slotTimes, slotTiming, weekDate } from '../utils/practicalTime';

export const ACTIVE_BOOKINGS = ['confirmed', 'cancellation_requested'];
export class PracticalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Actor = { _id: any; role: string };
const id = (value: any): string => String(value?._id ?? value);
const guardSchema = new Schema({ _id: String, version: { type: Number, default: 0 } }, { versionKey: false });
const Guard = mongoose.model('PracticalScheduleGuard', guardSchema);

// All practical mutations contend on this document inside a MongoDB transaction.
// Conflicting transactions retry with a fresh snapshot, across server instances.
export async function practicalMutation<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  try {
    await Guard.updateOne({ _id: 'institute' }, { $setOnInsert: { version: 0 } }, { upsert: true });
  } catch (error: any) { if (error.code !== 11000) throw error; }
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      await Guard.updateOne({ _id: 'institute' }, { $inc: { version: 1 } }, { session });
      result = await work(session);
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return result;
  } catch (error: any) {
    if (error.code === 20 || error.codeName === 'IllegalOperation') throw new PracticalError(503, 'Practical scheduling requires a MongoDB replica set or Atlas database.');
    throw error;
  } finally { await session.endSession(); }
}

function validId(value: any, label: string) {
  if (!mongoose.isValidObjectId(value)) throw new PracticalError(400, `Invalid ${label}.`);
}
export async function managedSlot(actor: Actor, slotId: any, session?: ClientSession) {
  validId(slotId, 'slot');
  if (!['admin', 'instructor'].includes(actor.role)) throw new PracticalError(403, 'Only admins and instructors can manage practical slots.');
  const slot = await PracticeSlot.findById(slotId).session(session || null);
  if (!slot) throw new PracticalError(404, 'Slot not found.');
  if (actor.role === 'instructor' && id(slot.instructor_id) !== id(actor)) throw new PracticalError(403, 'You can only manage your own practical slots.');
  return slot;
}
async function validateAssignment(actor: Actor, batchId: any, instructorId: any, session: ClientSession) {
  validId(batchId, 'batch'); validId(instructorId, 'instructor');
  const batch = await Batch.findById(batchId).session(session);
  if (!batch || batch.status !== 'active') throw new PracticalError(400, 'Choose an active batch.');
  if (actor.role === 'instructor' && id(actor) !== id(instructorId)) throw new PracticalError(403, 'Instructors cannot assign another instructor.');
  if (!['admin', 'instructor'].includes(actor.role)) throw new PracticalError(403, 'You cannot create practical slots.');
  if (!batch.instructor_ids.some(value => id(value) === id(instructorId))) throw new PracticalError(403, 'The instructor must be assigned to this batch.');
  const instructor = await User.findOne({ _id: instructorId, role: 'instructor', is_active: true }).session(session);
  if (!instructor) throw new PracticalError(400, 'Choose an active instructor.');
}
function validateSlot(slot: any, requireFutureStart: boolean) {
  try {
    const times = slotTimes(slot);
    if (!Number.isInteger(slot.max_students) || slot.max_students < 1) throw new Error('Capacity must be a positive whole number.');
    if (requireFutureStart && times.start <= Date.now()) throw new Error('Practical slots must start in the future.');
    if (slot.booking_deadline && (!Number.isFinite(new Date(slot.booking_deadline).getTime()) || new Date(slot.booking_deadline).getTime() > times.start)) {
      throw new Error('Booking deadline must be a valid time no later than the session start.');
    }
  } catch (error: any) { throw new PracticalError(400, error.message); }
}

async function validateSchedule(proposed: any[], excludeId: any, session: ClientSession) {
  const weeks = proposed.map(slot => weekDate(slot.week_start_date).getTime());
  // Older seeded slots may retain a time-of-day on Monday. Include the full
  // date rather than letting those sessions bypass timetable checks.
  const query: any = { week_start_date: { $gte: new Date(Math.min(...weeks)), $lt: new Date(Math.max(...weeks) + 86_400_000) } };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await PracticeSlot.find(query).session(session);
  // Locked sessions still run; locking only closes student bookings.
  const all = [...existing, ...proposed];
  for (const candidate of proposed) {
    const range = slotTimes(candidate);
    const concurrent = all.filter(other => other !== candidate && overlaps(range, slotTimes(other)));
    if (concurrent.some(other => id(other.instructor_id) === id(candidate.instructor_id))) {
      throw new PracticalError(409, 'This instructor already has an overlapping practical session.');
    }
    const events = [{ at: range.start, delta: 1 }, { at: range.end, delta: -1 }];
    for (const other of concurrent) {
      const times = slotTimes(other);
      events.push({ at: Math.max(times.start, range.start), delta: 1 }, { at: Math.min(times.end, range.end), delta: -1 });
    }
    events.sort((a, b) => a.at - b.at || a.delta - b.delta);
    let count = 0;
    for (const event of events) {
      count += event.delta;
      if (count > 2) throw new PracticalError(409, 'Only two instructors may conduct practical sessions at the same time in the institute.');
    }
  }
}

export function bookingBlockReason(slot: any, bookings: any[], now = Date.now()): string | null {
  const times = slotTimes(slot);
  if (now >= times.end) return 'This practical session has expired.';
  if (!slot.is_open) return 'This practical slot is locked.';
  if (now >= times.start) return 'This practical session has already started.';
  if (slot.booking_deadline && now >= new Date(slot.booking_deadline).getTime()) return 'The booking deadline has passed.';
  for (const booking of bookings) {
    const other = booking.slot_id;
    if (!other?.week_start_date) continue;
    if (id(other) === id(slot)) return 'You are already booked in this slot.';
    if (id(other.batch_id) === id(slot.batch_id) && weekDate(other.week_start_date).getTime() === weekDate(slot.week_start_date).getTime()) {
      return 'Only one practical booking per batch per week is allowed.';
    }
    if (overlaps(times, slotTimes(other))) return 'You already have a practical session at this time in another course.';
  }
  return null;
}

export async function createPracticalSlots(actor: Actor, input: any) {
  if (!input || !Array.isArray(input.slots) || input.slots.length < 1 || input.slots.length > 50) throw new PracticalError(400, 'Provide between 1 and 50 practical slots.');
  let week: Date;
  try { week = weekDate(input.week_start_date); } catch (error: any) { throw new PracticalError(400, error.message); }
  return practicalMutation(async session => {
    const proposed = [];
    for (const entry of input.slots) {
      if (!entry || typeof entry !== 'object') throw new PracticalError(400, 'Invalid practical slot.');
      const instructor = entry.instructor_id || input.instructor_id || actor._id;
      await validateAssignment(actor, input.batch_id, instructor, session);
      const slot = { batch_id: input.batch_id, instructor_id: instructor, week_start_date: week,
        day_of_week: entry.day_of_week, start_time: entry.start_time, end_time: entry.end_time,
        max_students: entry.max_students, equipment_note: entry.equipment_note, location: entry.location,
        booking_deadline: entry.booking_deadline, is_open: true };
      validateSlot(slot, true);
      proposed.push(slot);
    }
    await validateSchedule(proposed, null, session);
    return PracticeSlot.insertMany(proposed, { session });
  });
}

export async function updatePracticalSlot(actor: Actor, slotId: any, input: any) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PracticalError(400, 'Provide valid slot updates.');
  return practicalMutation(async session => {
    const slot = await managedSlot(actor, slotId, session);
    if (Date.now() >= slotTimes(slot).end) throw new PracticalError(400, 'Expired practical slots are view-only.');
    const scheduleChanged = ['day_of_week', 'start_time', 'end_time'].some(key => input[key] !== undefined && input[key] !== (slot as any)[key]);
    const candidate = { ...slot.toObject() } as any;
    for (const key of ['max_students', 'equipment_note', 'is_open', 'start_time', 'end_time', 'day_of_week', 'location', 'booking_deadline']) {
      if (input[key] !== undefined) candidate[key] = input[key];
    }
    if (input.instructor_id !== undefined) {
      if (actor.role !== 'admin' && id(input.instructor_id) !== id(slot.instructor_id)) throw new PracticalError(403, 'Only an admin may reassign an instructor.');
      candidate.instructor_id = input.instructor_id;
    }
    if (typeof candidate.is_open !== 'boolean') throw new PracticalError(400, 'Open status must be true or false.');
    await validateAssignment(actor, slot.batch_id, candidate.instructor_id, session);
    validateSlot(candidate, scheduleChanged);
    const active = await SlotBooking.find({ slot_id: slot._id, status: { $in: ACTIVE_BOOKINGS } }).session(session);
    if (active.length > candidate.max_students) throw new PracticalError(409, `Capacity cannot be below current bookings (${active.length}), including pending cancellations.`);
    await validateSchedule([candidate], slot._id, session);
    if (scheduleChanged && active.length) {
      const others = await SlotBooking.find({ student_id: { $in: active.map(b => b.student_id) }, slot_id: { $ne: slot._id }, status: { $in: ACTIVE_BOOKINGS } })
        .populate('slot_id').session(session);
      if (others.some(b => (b.slot_id as any)?.week_start_date && overlaps(slotTimes(candidate), slotTimes(b.slot_id)))) {
        throw new PracticalError(409, 'This change would overlap another practical booking for an enrolled student.');
      }
    }
    slot.set(candidate);
    await slot.save({ session });
    return { slot, studentIds: active.map(b => id(b.student_id)) };
  });
}

export async function bookPracticalSlot(actor: Actor, slotId: any, requestedStudent?: any) {
  return practicalMutation(async session => {
    validId(slotId, 'slot');
    const studentId = actor.role === 'student' ? actor._id : requestedStudent;
    validId(studentId, 'student');
    const slot = actor.role === 'student' ? await PracticeSlot.findById(slotId).session(session) : await managedSlot(actor, slotId, session);
    if (!slot) throw new PracticalError(404, 'Slot not found.');
    const student = await User.findOne({ _id: studentId, role: 'student', is_active: true }).session(session);
    const enrollment = await Enrollment.findOne({ student_id: studentId, batch_id: slot.batch_id, status: 'active' }).session(session);
    const batch = await Batch.findOne({ _id: slot.batch_id, status: 'active' }).session(session);
    if (!student || !enrollment || !batch) throw new PracticalError(403, 'The student must be active and enrolled in this batch.');
    const bookings = await SlotBooking.find({ student_id: studentId, status: { $in: ACTIVE_BOOKINGS } }).populate('slot_id').session(session);
    const reason = bookingBlockReason(slot, bookings);
    if (reason) throw new PracticalError(409, reason);
    const count = await SlotBooking.countDocuments({ slot_id: slot._id, status: { $in: ACTIVE_BOOKINGS } }).session(session);
    if (count >= slot.max_students) throw new PracticalError(409, 'This practical slot is full.');
    await SlotBooking.deleteMany({ slot_id: slot._id, student_id: studentId, status: 'cancelled' }).session(session);
    const [booking] = await SlotBooking.create([{ slot_id: slot._id, student_id: studentId, status: 'confirmed' }], { session });
    return { slot, booking };
  });
}

export async function requestPracticalCancellation(actor: Actor, slotId: any, reason: any) {
  if (actor.role !== 'student') throw new PracticalError(403, 'Only a student may request cancellation of their booking.');
  if (reason !== undefined && (typeof reason !== 'string' || reason.length > 2000)) throw new PracticalError(400, 'Cancellation reason must be text up to 2000 characters.');
  return practicalMutation(async session => {
    validId(slotId, 'slot');
    const slot = await PracticeSlot.findById(slotId).session(session);
    if (!slot) throw new PracticalError(404, 'Slot not found.');
    if (Date.now() >= slotTimes(slot).end) throw new PracticalError(400, 'Expired practical bookings cannot be cancelled.');
    if (!slot.is_open) throw new PracticalError(400, 'This slot is locked. Please contact your instructor.');
    const booking = await SlotBooking.findOneAndUpdate({ slot_id: slotId, student_id: actor._id, status: 'confirmed' },
      { status: 'cancellation_requested', cancellation_reason: reason || '' }, { new: true, session });
    if (!booking) throw new PracticalError(404, 'Confirmed booking not found, or cancellation is already pending.');
    return { slot, booking };
  });
}

export async function changePracticalBooking(actor: Actor, slotId: any, bookingId: any, action: 'remove' | 'approve' | 'reject') {
  return practicalMutation(async session => {
    const slot = await managedSlot(actor, slotId, session);
    validId(bookingId, 'booking');
    if (Date.now() >= slotTimes(slot).end) throw new PracticalError(400, 'Expired practical bookings are view-only.');
    const booking = await SlotBooking.findOne({ _id: bookingId, slot_id: slot._id,
      status: action === 'remove' ? { $in: ACTIVE_BOOKINGS } : 'cancellation_requested' }).session(session);
    if (!booking) throw new PracticalError(404, 'Booking not found in this slot, or its status has changed.');
    booking.status = action === 'reject' ? 'confirmed' : 'cancelled';
    await booking.save({ session });
    return { slot, booking };
  });
}

export async function deletePracticalSlot(actor: Actor, slotId: any) {
  return practicalMutation(async session => {
    const slot = await managedSlot(actor, slotId, session);
    const bookings = await SlotBooking.find({ slot_id: slot._id, status: { $in: ACTIVE_BOOKINGS } }).session(session);
    await SlotBooking.deleteMany({ slot_id: slot._id }).session(session);
    await slot.deleteOne({ session });
    return { slot, studentIds: bookings.map(b => id(b.student_id)) };
  });
}

export { slotTiming, slotTimes };
