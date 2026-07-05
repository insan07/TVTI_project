import express from 'express';
import { getActiveCourses } from '../controllers/courseController';

const router = express.Router();

router.get('/', getActiveCourses);
router.get('/active', getActiveCourses);

export default router;
