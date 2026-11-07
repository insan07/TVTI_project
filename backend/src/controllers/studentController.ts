import { Request, Response } from 'express';
import Enrollment from '../models/Enrollment';
import Batch from '../models/Batch';
import Notification from '../models/Notification';
import SlotBooking from '../models/SlotBooking';
import PracticeSlot from '../models/PracticeSlot';
import Video from '../models/Video';
import Announcement from '../models/Announcement';
import { AuthRequest } from '../middleware/authMiddleware';

export const getMySchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enrollments = await Enrollment.find({ student_id: req.user._id, status: 'active' }).select('batch_id');
    const batchIds = enrollments.map(e => e.batch_id);

    const batches = await Batch.find({ _id: { $in: batchIds } })
      .populate('course_id', 'title')
      .populate('instructor_ids', 'name')
      .lean();

    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getSlotEndTimestamp = (slot: any): number => {
  if (!slot?.week_start_date) return 0;
  const dayIdx = DAYS_LIST.indexOf(slot.day_of_week);
  const slotActualDate = new Date(slot.week_start_date);
  if (dayIdx !== -1) {
    slotActualDate.setUTCDate(slotActualDate.getUTCDate() + dayIdx);
  }
  const [h, m] = (slot.end_time || '23:59').split(':').map((v: string) => parseInt(v, 10) || 0);
  return new Date(
    slotActualDate.getUTCFullYear(),
    slotActualDate.getUTCMonth(),
    slotActualDate.getUTCDate(),
    h,
    m,
    0,
    0
  ).getTime();
};

const getSlotStartTimestamp = (slot: any): number => {
  if (!slot?.week_start_date) return Number.MAX_SAFE_INTEGER;
  const dayIdx = DAYS_LIST.indexOf(slot.day_of_week);
  const slotActualDate = new Date(slot.week_start_date);
  if (dayIdx !== -1) {
    slotActualDate.setUTCDate(slotActualDate.getUTCDate() + dayIdx);
  }
  const [h, m] = (slot.start_time || '00:00').split(':').map((v: string) => parseInt(v, 10) || 0);
  return new Date(
    slotActualDate.getUTCFullYear(),
    slotActualDate.getUTCMonth(),
    slotActualDate.getUTCDate(),
    h,
    m,
    0,
    0
  ).getTime();
};

export const getHomeDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ user_id: req.user._id }).sort({ createdAt: -1 }).limit(3);

    const enrollments = await Enrollment.find({ student_id: req.user._id, status: 'active' }).select('batch_id');
    const batchIds = enrollments.map(e => e.batch_id);

    const nextBatch = await Batch.findOne({ _id: { $in: batchIds } })
      .populate('course_id', 'title')
      .populate('instructor_ids', 'name email phone profile_photo')
      .lean();

    const nowMs = Date.now();

    const confirmedBookings = await SlotBooking.find({ student_id: req.user._id, status: 'confirmed' })
      .populate({
        path: 'slot_id',
        populate: [
          { path: 'batch_id', populate: { path: 'course_id', select: 'title' } },
          { path: 'instructor_id', select: 'name email phone profile_photo' }
        ]
      })
      .lean();

    const upcomingBookings = confirmedBookings
      .filter((b: any) => b.slot_id && getSlotEndTimestamp(b.slot_id) >= nowMs)
      .sort((a: any, b: any) => getSlotStartTimestamp(a.slot_id) - getSlotStartTimestamp(b.slot_id));

    const nextPracticeBooking = upcomingBookings[0] || null;

    let nextAvailablePractice = null;
    if (!nextPracticeBooking) {
      const openSlots = await PracticeSlot.find({ batch_id: { $in: batchIds }, is_open: true })
        .populate({ path: 'batch_id', populate: { path: 'course_id', select: 'title' } })
        .populate('instructor_id', 'name email phone profile_photo')
        .lean();

      const upcomingOpenSlots = openSlots
        .filter((s: any) => getSlotEndTimestamp(s) >= nowMs)
        .sort((a: any, b: any) => getSlotStartTimestamp(a) - getSlotStartTimestamp(b));

      nextAvailablePractice = upcomingOpenSlots[0] || null;
    }

    const theory_lessons = await Video.find({ batch_id: { $in: batchIds } })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const announcements = await Announcement.find({
      $or: [
        { batch_id: { $in: batchIds } },
        { batch_id: null },
      ],
    })
      .populate('batch_id', 'name')
      .populate('posted_by', 'name role')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
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
