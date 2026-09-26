import express from 'express';
import { postAnnouncement, getMyAnnouncements, deleteAnnouncement, updateAnnouncement, getPublicAnnouncements } from '../controllers/announcementController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';

const router = express.Router();

// Public route for website
router.get('/public', getPublicAnnouncements);

router.use(protect, checkRole(['admin', 'instructor']));
router.post('/', postAnnouncement);
router.get('/my', getMyAnnouncements);
router.put('/:id', updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

export default router;
