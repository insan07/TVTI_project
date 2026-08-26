import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/authMiddleware';

export const getMyNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await Notification.find({ user_id: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await Notification.countDocuments({ user_id: req.user._id, is_read: false });
    res.json({ unread_count: count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { is_read: true }
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { user_id: req.user._id, is_read: false },
      { is_read: true }
    );
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const sendCustomNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!['admin', 'instructor'].includes(req.user.role)) {
      res.status(403).json({ message: 'Not authorized to send notifications' });
      return;
    }

    const { userIds, role, batchId, title, message, type, link } = req.body;
    if (!title || !message) {
      res.status(400).json({ message: 'Title and message are required' });
      return;
    }

    const { sendNotification } = await import('../services/notificationService');
    const created = await sendNotification({
      userIds,
      role,
      batchId,
      title,
      message,
      type: type || 'admin_alert',
      link,
    });

    res.status(201).json({ message: 'Notification sent successfully', count: created.length });
  } catch (error) {
    console.error('Error sending custom notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
