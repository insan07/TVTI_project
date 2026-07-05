import express from 'express';
import { getMySchedule, getDashboardStats, getMyStudents } from '../controllers/instructorController';
import { getBatchTopics, uploadVideo, updateVideo, deleteVideo, getMyVideos } from '../controllers/videoController';
import { createSlots, getMySlots, updateSlot, getSlotBookings } from '../controllers/practiceSlotController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = express.Router();

router.use(protect, checkRole(['instructor']));
router.get('/my-schedule', getMySchedule);
router.get('/my-students', getMyStudents);
router.get('/dashboard-stats', getDashboardStats);

// Videos
router.get('/videos', getMyVideos);
router.get('/batches/:batchId/topics', getBatchTopics);
router.post('/videos', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'notes', maxCount: 1 }]), uploadVideo);
router.put('/videos/:id', updateVideo);
router.delete('/videos/:id', deleteVideo);

// Practice Sessions
router.post('/practice-slots', createSlots);
router.get('/practice-slots', getMySlots);
router.patch('/practice-slots/:slotId', updateSlot);
router.get('/practice-slots/:slotId/bookings', getSlotBookings);

export default router;
