import { Request, Response } from 'express';
import Announcement from '../models/Announcement';
import Enrollment from '../models/Enrollment';
import { sendNotification } from '../services/notificationService';
import { AuthRequest } from '../middleware/authMiddleware';

export const postAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batch_id, title, message } = req.body;

    const actualBatchId = (batch_id && batch_id !== 'all') ? batch_id : null;

    const announcement = await Announcement.create({
      batch_id: actualBatchId,
      posted_by: req.user._id,
      title,
      message,
    });

    // Send instant notifications to target students
    if (actualBatchId) {
      await sendNotification({
        batchId: actualBatchId,
        title: `New Announcement: ${title}`,
        message,
        type: 'announcement',
        relatedId: announcement._id,
        link: '/announcements'
      });
    } else {
      await sendNotification({
        role: 'student',
        title: `Announcement: ${title}`,
        message,
        type: 'announcement',
        relatedId: announcement._id,
        link: '/announcements'
      });
    }

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

// GET /api/students/announcements  — announcements for enrolled batches + global ones
export const getStudentAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enrollments = await Enrollment.find({ student_id: req.user._id, status: 'active' }).select('batch_id');
    const batchIds = enrollments.map((e) => e.batch_id);

    const announcements = await Announcement.find({
      $or: [
        { batch_id: { $in: batchIds } },  // batch-specific
        { batch_id: null },               // global announcements
      ],
    })
      .populate('batch_id', 'name')
      .populate('posted_by', 'name role')
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
