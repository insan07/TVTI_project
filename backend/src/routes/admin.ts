import express from 'express';
import { getUsers, getUserDetails, approveUser, rejectUser, deactivateUser, deleteUserCompletely, createInstructor, getAdminStats, getAdminActivities } from '../controllers/adminController';
import { getAdminCourses, createCourse, updateCourse, archiveCourse } from '../controllers/courseController';
import { getAdminBatches, getBatchDetails, createBatch, updateBatch, getBatchStudents, enrollStudents, deleteBatchCompletely } from '../controllers/batchController';
import { getBatchResults, createResult, updateResult } from '../controllers/resultController';
import { getApplications, updateApplicationStatus, deleteApplicationCompletely } from '../controllers/applicationController';
import { protect } from '../middleware/authMiddleware';
import { checkRole } from '../middleware/roleMiddleware';

const router = express.Router();

// All admin routes must be protected and restricted to 'admin' role
router.use(protect, checkRole(['admin']));

router.get('/stats', getAdminStats);
router.get('/activities', getAdminActivities);

// Applications
router.get('/applications', getApplications);
router.put('/applications/:id/status', updateApplicationStatus);
router.delete('/applications/:id', deleteApplicationCompletely);
router.get('/users', getUsers);
router.get('/users/:id/details', getUserDetails);
router.put('/users/:id/approve', approveUser);
router.put('/users/:id/reject', rejectUser);
router.put('/users/:id/deactivate', deactivateUser);
router.delete('/users/:id/delete', deleteUserCompletely);
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
router.delete('/batches/:id/delete', deleteBatchCompletely);
router.get('/batches/:id/students', getBatchStudents);
router.get('/batches/:batchId/results', getBatchResults);
router.post('/batches/:id/enroll', enrollStudents);

// Results
router.post('/results', createResult);
router.put('/results/:id', updateResult);

export default router;
