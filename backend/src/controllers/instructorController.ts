import { Request, Response } from 'express';
import Batch from '../models/Batch';
import Enrollment from '../models/Enrollment';
import { AuthRequest } from '../middleware/authMiddleware';
import Video from '../models/Video';
import PracticeSlot from '../models/PracticeSlot';
import Announcement from '../models/Announcement';

export const getMySchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batches = await Batch.find({ instructor_ids: req.user._id })
      .populate('course_id', 'title')
      .lean();

    const batchIds = batches.map(b => b._id);
    const enrollmentsCount = await Enrollment.aggregate([
      { $match: { batch_id: { $in: batchIds } } },
      { $group: { _id: '$batch_id', count: { $sum: 1 } } }
    ]);

    const batchStats = batches.map(b => {
      const eCount = enrollmentsCount.find(e => String(e._id) === String(b._id))?.count || 0;
      return { ...b, enrolled_count: eCount };
    });

    res.json(batchStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const instructorId = req.user._id;

    const totalBatches = await Batch.countDocuments({ instructor_ids: instructorId });
    const totalVideos = await Video.countDocuments({ instructor_id: instructorId });
    const totalAnnouncements = await Announcement.countDocuments({ posted_by: instructorId });

    const activeSlots = await PracticeSlot.find({ instructor_id: instructorId, is_open: true })
      .populate('batch_id', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentVideos = await Video.find({ instructor_id: instructorId })
      .populate('batch_id', 'name')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const recentAnnouncements = await Announcement.find({ posted_by: instructorId })
      .populate('batch_id', 'name')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    res.json({
      totalBatches,
      totalVideos,
      totalAnnouncements,
      activeSlots,
      recentVideos,
      recentAnnouncements
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batches = await Batch.find({ instructor_ids: req.user._id }).select('_id name course_id').populate('course_id', 'title');
    const batchIds = batches.map(b => b._id);
    
    const enrollments = await Enrollment.find({ batch_id: { $in: batchIds }, status: 'active' })
      .populate('student_id', 'name email phone')
      .populate({
        path: 'batch_id',
        select: 'name course_id',
        populate: { path: 'course_id', select: 'title' }
      })
      .lean();

    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
