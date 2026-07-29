import { Request, Response } from 'express';
import Announcement from '../models/Announcement';
import Enrollment from '../models/Enrollment';
// import { sendBatchNotification } from '../services/NotificationService';
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
