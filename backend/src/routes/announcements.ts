import express from 'express';
import { postAnnouncement, getMyAnnouncements } from '../controllers/announcementController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(protect, checkRole(['admin', 'instructor']));
router.post('/', postAnnouncement);
router.get('/my', getMyAnnouncements);

export default router;
