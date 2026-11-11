import { Response } from 'express';
import mongoose from 'mongoose';
import PracticeSlot from '../models/PracticeSlot';
import SlotBooking from '../models/SlotBooking';
import { AuthRequest } from '../middleware/authMiddleware';
import { ACTIVE_BOOKINGS, createPracticalSlots, updatePracticalSlot, managedSlot, bookPracticalSlot,
  changePracticalBooking, deletePracticalSlot, PracticalError, slotTimes, slotTiming } from '../services/practicalScheduling';
import { weekDate } from '../utils/practicalTime';
import { practicalFailure, practicalNotification } from './practicalResponses';

export const createSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const created = await createPracticalSlots(req.user, req.body);
    await practicalNotification({ batchId: String(req.body.batch_id), title: 'New Practice Slots Open',
      message: 'New practical sessions have been posted for your batch.', type: 'practice_slots', link: '/schedule' });
    const instructors = [...new Set(created.map(slot => String(slot.instructor_id)))];
    if (req.user.role === 'admin') await practicalNotification({ userIds: instructors, title: 'Practical Slots Assigned',
      message: 'You have been assigned new practical sessions.', type: 'practice_slots', link: '/instructor/practice' });
    res.status(201).json(created);
  } catch (error) { practicalFailure(res, error); }
};

export const getMySlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId, weekStart, instructorId, startDate, endDate } = req.query;
    const query: any = req.user.role === 'admin' ? {} : { instructor_id: req.user._id };
    for (const value of [batchId, instructorId]) if (value && !mongoose.isValidObjectId(value)) throw new PracticalError(400, 'Invalid schedule filter.');
    if (batchId) query.batch_id = batchId;
    if (instructorId && req.user.role === 'admin') query.instructor_id = instructorId;
    if (startDate || endDate) {
      const start = new Date(String(startDate)), end = new Date(String(endDate));
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) throw new PracticalError(400, 'Invalid schedule date range.');
      query.week_start_date = { $gte: start, $lt: new Date(end.getTime() + 86_400_000) };
    } else if (weekStart) {
      try {
        const week = weekDate(weekStart);
        query.week_start_date = { $gte: week, $lt: new Date(week.getTime() + 86_400_000) };
      } catch (error: any) { throw new PracticalError(400, error.message); }
    }
    const slots = await PracticeSlot.find(query)
      .populate({ path: 'batch_id', select: 'name course_id', populate: { path: 'course_id', select: 'title' } })
      .populate('instructor_id', 'name email phone');
    const counts = await SlotBooking.aggregate([
      { $match: { slot_id: { $in: slots.map(s => s._id) }, status: { $in: ACTIVE_BOOKINGS } } },
      { $group: { _id: '$slot_id', count: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', 'cancellation_requested'] }, 1, 0] } } } },
    ]);
    slots.sort((a, b) => slotTimes(b).start - slotTimes(a).start);
    res.json(slots.map(slot => {
      const count = counts.find(value => String(value._id) === String(slot._id));
      return { ...slot.toObject(), ...slotTiming(slot), booked_count: count?.count || 0, pending_cancellation_count: count?.pending || 0 };
    }));
  } catch (error) { practicalFailure(res, error); }
};

export const getSlotBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slot = await managedSlot(req.user, req.params.slotId);
    const bookings = await SlotBooking.find({ slot_id: slot._id, status: { $in: ACTIVE_BOOKINGS } })
      .populate('student_id', 'name email phone index_number nic');
    res.json(bookings);
  } catch (error) { practicalFailure(res, error); }
};

export const updateSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slot, studentIds } = await updatePracticalSlot(req.user, req.params.slotId, req.body);
    if (studentIds.length) await practicalNotification({ userIds: studentIds, title: 'Practical Slot Updated',
      message: `Your practical session is scheduled for ${slot.day_of_week} (${slot.start_time}–${slot.end_time})${slot.location ? ` at ${slot.location}` : ''}.`,
      type: 'schedule_change', relatedId: slot._id, link: '/schedule' });
    if (req.user.role === 'admin' && req.body.instructor_id) await practicalNotification({ userIds: [String(slot.instructor_id)],
      title: 'Practical Slot Assigned', message: `You are assigned to ${slot.day_of_week} (${slot.start_time}–${slot.end_time}).`,
      type: 'practice_slots', relatedId: slot._id, link: '/instructor/practice' });
    res.json({ ...slot.toObject(), ...slotTiming(slot) });
  } catch (error) { practicalFailure(res, error); }
};

export const deleteSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slot, studentIds } = await deletePracticalSlot(req.user, req.params.slotId);
    if (studentIds.length) await practicalNotification({ userIds: studentIds, title: 'Practical Session Cancelled',
      message: `The practical session on ${slot.day_of_week} (${slot.start_time}–${slot.end_time}) has been cancelled.`,
      type: 'schedule_change', relatedId: slot._id, link: '/schedule' });
    res.json({ message: 'Slot deleted successfully' });
  } catch (error) { practicalFailure(res, error); }
};

export const addStudentBookingByAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slot, booking } = await bookPracticalSlot(req.user, req.params.slotId, req.body.student_id);
    await practicalNotification({ userIds: [String(booking.student_id)], title: 'Practical Slot Assigned',
      message: `You are booked for ${slot.day_of_week} (${slot.start_time}–${slot.end_time}).`,
      type: 'booking_confirmed', relatedId: slot._id, link: '/schedule' });
    res.status(201).json(booking);
  } catch (error) { practicalFailure(res, error); }
};

const bookingAction = (action: 'remove' | 'approve' | 'reject') => async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slot, booking } = await changePracticalBooking(req.user, req.params.slotId, req.params.bookingId, action);
    const message = action === 'remove' ? 'Booking removed' : action === 'approve' ? 'Cancellation approved' : 'Cancellation declined; your booking remains confirmed';
    await practicalNotification({ userIds: [String(booking.student_id)], title: message,
      message: `${message} for ${slot.day_of_week} (${slot.start_time}–${slot.end_time}).`,
      type: action === 'remove' ? 'booking_rejected' : action === 'approve' ? 'cancellation_approved' : 'cancellation_rejected',
      relatedId: slot._id, link: '/schedule' });
    res.json({ message });
  } catch (error) { practicalFailure(res, error); }
};
export const cancelBookingByAdmin = bookingAction('remove');
export const approveCancellation = bookingAction('approve');
export const rejectCancellation = bookingAction('reject');
