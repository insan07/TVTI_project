import { Request, Response } from 'express';
import Enrollment from '../models/Enrollment';
import Batch from '../models/Batch';
import Notification from '../models/Notification';
import SlotBooking from '../models/SlotBooking';
import PracticeSlot from '../models/PracticeSlot';
import { getRecentTheoryLessons } from '../services/studentVideoActivity';
import Announcement from '../models/Announcement';
import { AuthRequest } from '../middleware/authMiddleware';
import { ACTIVE_BOOKINGS, bookingBlockReason, slotTimes } from '../services/practicalScheduling';

export const getMySchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enrollments = await Enrollment.find({ student_id: req.user._id, status: 'active' }).select('batch_id');
    const batchIds = enrollments.map(e => e.batch_id);

    const batches = await Batch.find({ _id: { $in: batchIds }, status: 'active' })
      .populate('course_id', 'title')
      .populate('instructor_ids', 'name')
      .lean();

    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getSlotEndTimestamp = (slot: any): number => {
  return slot?.week_start_date ? slotTimes(slot).end : 0;
};

const getSlotStartTimestamp = (slot: any): number => {
  return slot?.week_start_date ? slotTimes(slot).start : Number.MAX_SAFE_INTEGER;
};

export const getHomeDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ user_id: req.user._id }).sort({ createdAt: -1 }).limit(3);

    const enrollments = await Enrollment.find({ student_id: req.user._id, status: 'active' }).select('batch_id');
    const batchIds = enrollments.map(e => e.batch_id).filter(Boolean);
    const hasAssignedBatch = batchIds.length > 0;

    let assignedBatches: any[] = [];
    let nextBatch = null;
    let nextPracticeBooking = null;
    let nextAvailablePractice = null;
    let theory_lessons: any[] = [];

    const nowMs = Date.now();

    if (hasAssignedBatch) {
      assignedBatches = await Batch.find({ _id: { $in: batchIds }, status: 'active' })
        .populate('course_id', 'title code')
        .lean();

      nextBatch = await Batch.findOne({ _id: { $in: batchIds }, status: 'active' })
        .populate('course_id', 'title code')
        .populate('instructor_ids', 'name email phone profile_photo')
        .lean();

      const confirmedBookings = await SlotBooking.find({ student_id: req.user._id, status: { $in: ACTIVE_BOOKINGS } })
        .populate({
          path: 'slot_id',
          populate: [
            { path: 'batch_id', populate: { path: 'course_id', select: 'title code' } },
            { path: 'instructor_id', select: 'name email phone profile_photo' }
          ]
        })
        .lean();

      const upcomingBookings = confirmedBookings
        .filter((b: any) => b.slot_id && getSlotEndTimestamp(b.slot_id) > nowMs)
        .sort((a: any, b: any) => getSlotStartTimestamp(a.slot_id) - getSlotStartTimestamp(b.slot_id));

      nextPracticeBooking = upcomingBookings[0] || null;

      if (!nextPracticeBooking) {
        const openSlots = await PracticeSlot.find({ batch_id: { $in: batchIds }, is_open: true })
          .populate({ path: 'batch_id', populate: { path: 'course_id', select: 'title code' } })
          .populate('instructor_id', 'name email phone profile_photo')
          .lean();

        const counts = await SlotBooking.aggregate([
          { $match: { slot_id: { $in: openSlots.map(s => s._id) }, status: { $in: ACTIVE_BOOKINGS } } },
          { $group: { _id: '$slot_id', count: { $sum: 1 } } },
        ]);

        const upcomingOpenSlots = openSlots
          .filter((s: any) => !bookingBlockReason(s, confirmedBookings, nowMs)
            && (counts.find(c => String(c._id) === String(s._id))?.count || 0) < s.max_students)
          .sort((a: any, b: any) => getSlotStartTimestamp(a) - getSlotStartTimestamp(b));

        nextAvailablePractice = upcomingOpenSlots[0] || null;
      }

      theory_lessons = await getRecentTheoryLessons(req.user._id, batchIds);
    }

    const announcements = await Announcement.find({
      $or: [
        ...(hasAssignedBatch ? [{ batch_id: { $in: batchIds } }] : []),
        { batch_id: null },
      ],
    })
      .populate('batch_id', 'name')
      .populate('posted_by', 'name role')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      has_assigned_batch: hasAssignedBatch,
      assigned_batches: assignedBatches,
      notifications,
      announcements,
      next_class: nextBatch,
      next_practice: nextPracticeBooking,
      next_available_practice: nextAvailablePractice,
      theory_lessons
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
