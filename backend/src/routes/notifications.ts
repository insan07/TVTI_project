import express from 'express';
import { getMyNotifications, getUnreadCount, markAsRead, markAllAsRead, sendCustomNotification } from '../controllers/notificationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/my', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/mark-all-read', markAllAsRead);
router.put('/:id/read', markAsRead);
router.post('/send', sendCustomNotification);

export default router;
