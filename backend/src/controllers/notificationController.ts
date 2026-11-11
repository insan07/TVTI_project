import { Request, Response } from 'express';
import mongoose from 'mongoose';
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
    if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ message: 'Invalid notification.' }); return; }
    const requested = req.body?.is_read;
    if (requested !== undefined && typeof requested !== 'boolean') { res.status(400).json({ message: 'Read status must be true or false.' }); return; }
    const isRead = requested ?? true;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id },
      { is_read: isRead },
      { new: true }
    );
    if (!notification) { res.status(404).json({ message: 'Notification not found' }); return; }
    res.json({ message: isRead ? 'Marked as read' : 'Marked as unread', is_read: isRead });
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

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user._id,
    });
    if (!deleted) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const clearAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.deleteMany({ user_id: req.user._id });
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteSelectedNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))) {
      res.status(400).json({ message: 'Select valid notifications to delete.' });
      return;
    }
    const result = await Notification.deleteMany({ user_id: req.user._id, _id: { $in: [...new Set(ids)] } });
    res.json({ message: 'Selected notifications deleted', deleted_count: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Notifications could not be deleted. Please try again.' });
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
