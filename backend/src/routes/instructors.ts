import express from 'express';
import { getMySchedule, getDashboardStats, getMyStudents } from '../controllers/instructorController';
import { getBatchTopics, getMyVideos, getMyMaterials, uploadVideo, updateVideo, deleteVideo } from '../controllers/videoController';
import { uploadMaterial } from '../controllers/uploadController';
import { createSlots, getMySlots, updateSlot, deleteSlot, getSlotBookings, cancelBookingByAdmin, addStudentBookingByAdmin } from '../controllers/practiceSlotController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = express.Router();

router.use(protect, checkRole(['instructor', 'admin']));

// ── Dashboard ───────────────────────────────────────────────────────────────
router.get('/dashboard-stats', getDashboardStats);
router.get('/my-schedule',     getMySchedule);
router.get('/my-students',     getMyStudents);

// ── Videos ──────────────────────────────────────────────────────────────────
router.get('/videos',     getMyVideos);
router.post(
  '/videos',
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'notes', maxCount: 1 },
  ]),
  uploadVideo
);
router.put('/videos/:id',    updateVideo);
router.delete('/videos/:id', deleteVideo);

// ── Materials ────────────────────────────────────────────────────────────────
router.get('/materials', getMyMaterials);
router.post(
  '/materials',
  upload.fields([
    { name: 'material', maxCount: 1 },
  ]),
  uploadMaterial
);

// ── Batch Topics ─────────────────────────────────────────────────────────────
router.get('/batches/:batchId/topics', getBatchTopics);

// ── Practice Slots ───────────────────────────────────────────────────────────
router.post('/practice-slots',                             createSlots);
router.get('/practice-slots',                              getMySlots);
router.patch('/practice-slots/:slotId',                    updateSlot);
router.delete('/practice-slots/:slotId',                   deleteSlot);
router.get('/practice-slots/:slotId/bookings',             getSlotBookings);
router.post('/practice-slots/:slotId/bookings',            addStudentBookingByAdmin);
router.delete('/practice-slots/:slotId/bookings/:bookingId', cancelBookingByAdmin);

export default router;
