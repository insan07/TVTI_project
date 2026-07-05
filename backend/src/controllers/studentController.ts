import { Request, Response } from 'express';
import Enrollment from '../models/Enrollment';
import Batch from '../models/Batch';
import Notification from '../models/Notification';
import SlotBooking from '../models/SlotBooking';
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

export const getHomeDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ user_id: req.user._id }).sort({ createdAt: -1 }).limit(3);

    const enrollments = await Enrollment.find({ student_id: req.user._id, status: 'active' }).select('batch_id');
    const batchIds = enrollments.map(e => e.batch_id);

    const nextBatch = await Batch.findOne({ _id: { $in: batchIds } })
      .populate('course_id', 'title')
      .populate('instructor_ids', 'name')
      .lean();

    const nextPracticeBooking = await SlotBooking.findOne({ student_id: req.user._id, status: 'confirmed' })
      .populate({
        path: 'slot_id',
        populate: [
          { path: 'batch_id', populate: { path: 'course_id', select: 'title' } },
          { path: 'instructor_id', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      notifications,
      next_class: nextBatch,
      next_practice: nextPracticeBooking
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
