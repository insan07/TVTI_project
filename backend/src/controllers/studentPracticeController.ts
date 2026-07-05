import { Response } from 'express';
import PracticeSlot from '../models/PracticeSlot';
import SlotBooking from '../models/SlotBooking';
import Enrollment from '../models/Enrollment';
import { AuthRequest } from '../middleware/authMiddleware';
// import { sendPushNotification } from '../services/NotificationService';

// GET /api/student/practice-slots?batchId=&weekStart=
export const getOpenSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId, weekStart } = req.query;

    const enrolled = await Enrollment.findOne({ student_id: req.user?._id, batch_id: batchId, status: 'active' });
    if (!enrolled) { res.status(403).json({ message: 'Not enrolled in this batch' }); return; }

    const query: any = { batch_id: batchId, is_open: true };
    if (weekStart) {
      const normalized = new Date(weekStart as string);
      normalized.setUTCHours(0, 0, 0, 0);
      query.week_start_date = normalized;
    }

    const slots = await PracticeSlot.find(query)
      .populate('instructor_id', 'name')
      .sort({ day_of_week: 1, start_time: 1 });

    const slotIds = slots.map(s => s._id);
    const [counts, myBookings] = await Promise.all([
      SlotBooking.aggregate([
        { $match: { slot_id: { $in: slotIds }, status: 'confirmed' } },
        { $group: { _id: '$slot_id', count: { $sum: 1 } } }
      ]),
      SlotBooking.find({ slot_id: { $in: slotIds }, student_id: req.user?._id, status: 'confirmed' }).select('slot_id')
    ]);

    const myBookedSlotIds = new Set(myBookings.map(b => String(b.slot_id)));

    const result = slots.map(s => {
      const booked = counts.find(x => String(x._id) === String(s._id))?.count || 0;
      return {
        ...s.toObject(),
        seats_taken: booked,
        seats_available: s.max_students - booked,
        already_booked: myBookedSlotIds.has(String(s._id)),
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/student/practice-slots/:slotId/book
export const bookSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slot = await PracticeSlot.findById(req.params.slotId);
    if (!slot || !slot.is_open) { res.status(404).json({ message: 'Slot not available' }); return; }

    const confirmed = await SlotBooking.countDocuments({ slot_id: slot._id, status: 'confirmed' });
    if (confirmed >= slot.max_students) { res.status(400).json({ message: 'This slot is full' }); return; }

    // One booking per week per batch rule
    const weekSlots = await PracticeSlot.find({ batch_id: slot.batch_id, week_start_date: slot.week_start_date }).select('_id');
    const weekSlotIds = weekSlots.map(s => s._id);
    const alreadyBooked = await SlotBooking.findOne({
      slot_id: { $in: weekSlotIds },
      student_id: req.user?._id,
      status: 'confirmed'
    });
    if (alreadyBooked) {
      res.status(400).json({ message: 'You already have a session booked this week for this batch' });
      return;
    }

    const booking = await SlotBooking.create({ slot_id: slot._id, student_id: req.user?._id });

    /*
    try {
      await sendPushNotification(
        String(slot.instructor_id),
        'New session booking',
        `A student booked your ${slot.day_of_week} ${slot.start_time} slot.`,
        { type: 'session_booked' }
      );
    } catch (e) {
      console.error('Notification failed', e);
    }
    */

    res.status(201).json(booking);
  } catch (error: any) {
    if (error.code === 11000) { res.status(400).json({ message: 'Already booked this slot' }); return; }
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/student/practice-slots/:slotId/book
export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await SlotBooking.findOneAndUpdate(
      { slot_id: req.params.slotId, student_id: req.user?._id, status: 'confirmed' },
      { status: 'cancelled' },
      { new: true }
    );
    if (!result) { res.status(404).json({ message: 'Booking not found' }); return; }
    res.json({ message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/student/my-practice-bookings
export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookings = await SlotBooking.find({ student_id: req.user?._id, status: 'confirmed' })
      .populate({
        path: 'slot_id',
        populate: [
          {
            path: 'batch_id',
            select: 'course_id',
            populate: { path: 'course_id', select: 'title' }
          },
          { path: 'instructor_id', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
