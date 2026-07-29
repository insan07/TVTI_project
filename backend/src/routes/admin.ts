import express from 'express';
import { getUsers, getUserDetails, approveUser, rejectUser, deactivateUser, createInstructor, getAdminStats } from '../controllers/adminController';
import { getAdminCourses, createCourse, updateCourse, archiveCourse } from '../controllers/courseController';
import { getAdminBatches, getBatchDetails, createBatch, updateBatch, getBatchStudents, enrollStudents } from '../controllers/batchController';
import { getBatchResults, createResult, updateResult } from '../controllers/resultController';
import { getApplications, updateApplicationStatus } from '../controllers/applicationController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';

const router = express.Router();

// All admin routes must be protected and restricted to 'admin' role
router.use(protect, checkRole(['admin']));

router.get('/stats', getAdminStats);

// Applications
router.get('/applications', getApplications);
router.put('/applications/:id/status', updateApplicationStatus);
router.get('/users', getUsers);
router.get('/users/:id/details', getUserDetails);
router.put('/users/:id/approve', approveUser);
router.put('/users/:id/reject', rejectUser);
router.put('/users/:id/deactivate', deactivateUser);
router.post('/users/instructor', createInstructor);

// Courses
router.get('/courses', getAdminCourses);
router.post('/courses', createCourse);
router.put('/courses/:id', updateCourse);
router.put('/courses/:id/archive', archiveCourse);

// Batches
router.get('/batches', getAdminBatches);
router.get('/batches/:id/details', getBatchDetails);
router.post('/batches', createBatch);
router.put('/batches/:id', updateBatch);
router.get('/batches/:id/students', getBatchStudents);
router.get('/batches/:batchId/results', getBatchResults);
router.post('/batches/:id/enroll', enrollStudents);

// Results
router.post('/results', createResult);
router.put('/results/:id', updateResult);

export default router;
