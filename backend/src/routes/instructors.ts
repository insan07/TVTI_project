import express from 'express';
import { getMySchedule, getDashboardStats, getMyStudents } from '../controllers/instructorController';
import { getBatchTopics, getMyVideos, getMyMaterials, uploadVideo, updateVideo, deleteVideo } from '../controllers/videoController';
import { uploadMaterial } from '../controllers/uploadController';
import { createSlots, getMySlots, updateSlot, getSlotBookings } from '../controllers/practiceSlotController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = express.Router();

router.use(protect, checkRole(['instructor']));

// ── Dashboard ───────────────────────────────────────────────────────────────
router.get('/dashboard-stats', getDashboardStats);
router.get('/my-schedule',     getMySchedule);
router.get('/my-students',     getMyStudents);

// ── Videos ──────────────────────────────────────────────────────────────────
// GET    /api/instructors/videos              → list my videos
// POST   /api/instructors/videos              → upload a video (YouTube URL or video file + optional notes)
// PUT    /api/instructors/videos/:id          → update video metadata
// DELETE /api/instructors/videos/:id          → delete video
router.get('/videos',     getMyVideos);
router.post(
  '/videos',
  upload.fields([
    { name: 'video', maxCount: 1 },   // optional: actual video file
    { name: 'notes', maxCount: 1 },   // optional: notes/PDF attachment
  ]),
  uploadVideo
);
router.put('/videos/:id',    updateVideo);
router.delete('/videos/:id', deleteVideo);

// ── Materials ────────────────────────────────────────────────────────────────
// GET  /api/instructors/materials             → list my materials
// POST /api/instructors/materials             → upload a material file (PDF/DOC/DOCX)
router.get('/materials', getMyMaterials);
router.post(
  '/materials',
  upload.fields([
    { name: 'material', maxCount: 1 }, // required: PDF / DOC / DOCX
  ]),
  uploadMaterial
);

// ── Batch Topics ─────────────────────────────────────────────────────────────
router.get('/batches/:batchId/topics', getBatchTopics);

// ── Practice Slots ───────────────────────────────────────────────────────────
router.post('/practice-slots',                    createSlots);
router.get('/practice-slots',                     getMySlots);
router.patch('/practice-slots/:slotId',           updateSlot);
router.get('/practice-slots/:slotId/bookings',    getSlotBookings);

export default router;
