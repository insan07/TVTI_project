import { Request, Response } from 'express';
import Announcement from '../models/Announcement';
import Enrollment from '../models/Enrollment';
// import { sendBatchNotification } from '../services/NotificationService';
import { AuthRequest } from '../middleware/authMiddleware';

export const postAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batch_id, title, message } = req.body;

    const announcement = await Announcement.create({
      batch_id,
      posted_by: req.user._id,
      title,
      message,
    });

    const enrollments = await Enrollment.find({ batch_id, status: 'active' }).select('student_id');
    const studentIds = enrollments.map(e => e.student_id.toString());

    /*
    if (studentIds.length > 0) {
      await sendBatchNotification(
        studentIds,
        title,
        message,
        'announcement',
        { batchId: batch_id }
      );
    }
    */

    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const announcements = await Announcement.find({ posted_by: req.user._id })
      .populate('batch_id', 'name')
      .sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
