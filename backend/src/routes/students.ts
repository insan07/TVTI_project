import express from 'express';
import { getMySchedule, getHomeDashboard } from '../controllers/studentController';
import { getMyResults } from '../controllers/resultController';
import { getEnrolledBatches, getBatchVideos, getVideoStreamUrl, getNotesUrl } from '../controllers/studentVideoController';
import { getOpenSlots, bookSlot, cancelBooking as cancelPracticeBooking, getMyBookings as getMyPracticeBookings } from '../controllers/studentPracticeController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';

const router = express.Router();

router.use(protect, checkRole(['student']));
router.get('/my-schedule', getMySchedule);
router.get('/home', getHomeDashboard);

router.get('/batches', getEnrolledBatches);
router.get('/batches/:batchId/videos', getBatchVideos);
router.get('/videos/:videoId/stream-url', getVideoStreamUrl);
router.get('/videos/:videoId/notes-url', getNotesUrl);

// Practice Sessions
router.get('/practice-slots', getOpenSlots);
router.post('/practice-slots/:slotId/book', bookSlot);
router.delete('/practice-slots/:slotId/book', cancelPracticeBooking);
router.get('/my-practice-bookings', getMyPracticeBookings);

// Results
router.get('/my-results', getMyResults);

export default router;
