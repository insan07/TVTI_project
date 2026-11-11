import { Response } from 'express';
import mongoose from 'mongoose';
import PracticeSlot from '../models/PracticeSlot';
import SlotBooking from '../models/SlotBooking';
import Enrollment from '../models/Enrollment';
import { AuthRequest } from '../middleware/authMiddleware';
import { ACTIVE_BOOKINGS, bookPracticalSlot, requestPracticalCancellation, bookingBlockReason, PracticalError,
  slotTiming, slotTimes } from '../services/practicalScheduling';
import { weekDate } from '../utils/practicalTime';
import { practicalFailure, practicalNotification } from './practicalResponses';

export const getOpenSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId, weekStart } = req.query;
    if (!mongoose.isValidObjectId(batchId)) throw new PracticalError(400, 'Choose a valid batch.');
    const enrolled = await Enrollment.findOne({ student_id: req.user._id, batch_id: batchId, status: 'active' });
    if (!enrolled) throw new PracticalError(403, 'Not enrolled in this batch.');
    const query: any = { batch_id: batchId };
    if (weekStart) {
      try {
        const week = weekDate(weekStart);
        query.week_start_date = { $gte: week, $lt: new Date(week.getTime() + 86_400_000) };
      } catch (error: any) { throw new PracticalError(400, error.message); }
    }
    const all = await PracticeSlot.find(query).populate('instructor_id', 'name')
      .populate({ path: 'batch_id', select: 'name course_id status', populate: { path: 'course_id', select: 'title' } });
    const myBookings = await SlotBooking.find({ student_id: req.user._id, status: { $in: ACTIVE_BOOKINGS } }).populate('slot_id');
    const mine = new Map(myBookings.filter(b => b.slot_id).map(b => [String((b.slot_id as any)._id), b.status]));
    const counts = await SlotBooking.aggregate([
      { $match: { slot_id: { $in: all.map(s => s._id) }, status: { $in: ACTIVE_BOOKINGS } } },
      { $group: { _id: '$slot_id', count: { $sum: 1 } } },
    ]);
    const slots = all.filter(slot => slot.is_open || mine.has(String(slot._id)));
    slots.sort((a, b) => slotTimes(b).start - slotTimes(a).start);
    res.json(slots.map(slot => {
      const count = counts.find(value => String(value._id) === String(slot._id))?.count || 0;
      const reason = (slot.batch_id as any)?.status !== 'active' ? 'This batch is no longer active.'
        : bookingBlockReason(slot, myBookings) || (count >= slot.max_students ? 'This practical slot is full.' : null);
      return { ...slot.toObject(), ...slotTiming(slot), seats_taken: count, seats_available: Math.max(0, slot.max_students - count),
        already_booked: mine.has(String(slot._id)), booking_status: mine.get(String(slot._id)) || null,
        can_book: !reason, booking_block_reason: reason };
    }));
  } catch (error) { practicalFailure(res, error); }
};

export const bookSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slot, booking } = await bookPracticalSlot(req.user, req.params.slotId);
    await practicalNotification({ userIds: [String(slot.instructor_id)], title: 'New Session Booking',
      message: `${req.user.name || 'A student'} booked ${slot.day_of_week} (${slot.start_time}–${slot.end_time}).`,
      type: 'session_booked', relatedId: slot._id, link: '/instructor/slots' });
    await practicalNotification({ userIds: [String(booking.student_id)], title: 'Practical Slot Booked',
      message: `Your session on ${slot.day_of_week} (${slot.start_time}–${slot.end_time}) is confirmed.`,
      type: 'booking_confirmed', relatedId: slot._id, link: '/schedule' });
    res.status(201).json(booking);
  } catch (error) { practicalFailure(res, error); }
};

export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { slot } = await requestPracticalCancellation(req.user, req.params.slotId, req.body?.reason);
    await practicalNotification({ userIds: [String(slot.instructor_id)], title: 'Booking Cancellation Requested',
      message: `${req.user.name || 'A student'} requested cancellation for ${slot.day_of_week} (${slot.start_time}–${slot.end_time}).`,
      type: 'booking_cancelled', relatedId: slot._id, link: '/instructor/slots' });
    res.json({ message: 'Cancellation requested' });
  } catch (error) { practicalFailure(res, error); }
};

export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookings = await SlotBooking.find({ student_id: req.user._id, status: { $in: ACTIVE_BOOKINGS } })
      .populate({ path: 'slot_id', populate: [
        { path: 'batch_id', select: 'name course_id', populate: { path: 'course_id', select: 'title' } },
        { path: 'instructor_id', select: 'name' },
      ] });
    res.json(bookings.filter(booking => booking.slot_id).sort((a, b) => slotTimes(b.slot_id).start - slotTimes(a.slot_id).start)
      .map(booking => ({ ...booking.toObject(), slot_id: { ...(booking.slot_id as any).toObject(), ...slotTiming(booking.slot_id) } })));
  } catch (error) { practicalFailure(res, error); }
};
